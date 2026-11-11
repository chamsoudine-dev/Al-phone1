// Service Go (optionnel) : webhook CinetPay, alternative à la fonction Supabase "cinetpay-notify".
// Bibliothèque standard uniquement. Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, CINETPAY_APIKEY, CINETPAY_SITE_ID   (PORT optionnel, 8080 par défaut)
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("variable d'environnement manquante : %s", k)
	}
	return v
}

var (
	supaURL = strings.TrimRight(mustEnv("SUPABASE_URL"), "/")
	supaKey = mustEnv("SUPABASE_SERVICE_KEY")
	cpKey   = mustEnv("CINETPAY_APIKEY")
	cpSite  = mustEnv("CINETPAY_SITE_ID")
	idRe    = regexp.MustCompile(`^MBT-[A-Z0-9]{6,30}$`)
	client  = &http.Client{Timeout: 10 * time.Second}
	rl      = &limiter{hits: map[string][]time.Time{}}
)

// Limiteur simple : 30 appels par minute et par IP.
type limiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

func (l *limiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	keep := l.hits[ip][:0]
	for _, t := range l.hits[ip] {
		if now.Sub(t) < time.Minute {
			keep = append(keep, t)
		}
	}
	if len(keep) >= 30 {
		l.hits[ip] = keep
		return false
	}
	l.hits[ip] = append(keep, now)
	return true
}

func supa(method, path string, body any) (*http.Response, error) {
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, supaURL+"/rest/v1/"+path, rd)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", supaKey)
	req.Header.Set("Authorization", "Bearer "+supaKey)
	req.Header.Set("Content-Type", "application/json")
	return client.Do(req)
}

type order struct {
	ID            string `json:"id"`
	Total         int    `json:"total"`
	PaymentStatus string `json:"payment_status"`
}

func getOrder(id string) (*order, error) {
	resp, err := supa("GET", "orders?id=eq."+id+"&select=id,total,payment_status", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var list []order
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil || len(list) == 0 {
		return nil, fmt.Errorf("commande introuvable")
	}
	return &list[0], nil
}

type checkResp struct {
	Data struct {
		Status   string `json:"status"`
		Amount   any    `json:"amount"`
		Currency string `json:"currency"`
	} `json:"data"`
}

// On ne croit jamais le contenu du webhook : on interroge CinetPay.
func checkPayment(id string) (*checkResp, error) {
	b, _ := json.Marshal(map[string]string{"apikey": cpKey, "site_id": cpSite, "transaction_id": id})
	resp, err := client.Post("https://api-checkout.cinetpay.com/v2/payment/check", "application/json", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var c checkResp
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func transID(r *http.Request) string {
	if strings.Contains(r.Header.Get("Content-Type"), "application/json") {
		var m map[string]any
		if json.NewDecoder(r.Body).Decode(&m) == nil {
			return fmt.Sprint(m["cpm_trans_id"])
		}
		return ""
	}
	if r.ParseForm() != nil {
		return ""
	}
	return r.PostForm.Get("cpm_trans_id")
}

func notify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "méthode refusée", http.StatusMethodNotAllowed)
		return
	}
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if !rl.allow(ip) {
		http.Error(w, "trop de requêtes", http.StatusTooManyRequests)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	id := transID(r)
	if !idRe.MatchString(id) {
		fmt.Fprint(w, "ignored")
		return
	}
	o, err := getOrder(id)
	if err != nil || o.PaymentStatus == "PAID" {
		fmt.Fprint(w, "ok")
		return
	}
	c, err := checkPayment(id)
	if err != nil {
		http.Error(w, "vérification impossible", http.StatusBadGateway) // CinetPay réessaiera
		return
	}
	amount, _ := strconv.ParseFloat(fmt.Sprint(c.Data.Amount), 64)
	switch {
	case c.Data.Status == "ACCEPTED" && int(amount) == o.Total && c.Data.Currency == "XOF":
		resp, err := supa("POST", "rpc/finalize_order", map[string]string{"p_id": id, "p_status": "PAID"})
		if err != nil || resp.StatusCode >= 300 {
			log.Printf("finalize_order a échoué pour %s", id)
			http.Error(w, "erreur interne", http.StatusInternalServerError)
			return
		}
		resp.Body.Close()
		log.Printf("commande %s payée", id)
	case c.Data.Status == "REFUSED":
		if resp, err := supa("PATCH", "orders?id=eq."+id+"&payment_status=eq.PENDING", map[string]string{"payment_status": "FAILED"}); err == nil {
			resp.Body.Close()
		}
	}
	fmt.Fprint(w, "ok")
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/notify", notify)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { fmt.Fprint(w, "ok") })
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{Addr: ":" + port, Handler: mux, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second}
	log.Printf("écoute sur :%s", port)
	log.Fatal(srv.ListenAndServe())
}

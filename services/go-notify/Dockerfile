FROM golang:1.22-alpine AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /notify .
FROM gcr.io/distroless/static
COPY --from=build /notify /notify
ENTRYPOINT ["/notify"]

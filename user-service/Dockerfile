FROM golang:1.23-alpine
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o user-service .
EXPOSE 4001
CMD ["./user-service"]
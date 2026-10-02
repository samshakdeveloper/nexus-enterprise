# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache protoc protobuf-dev
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest

WORKDIR /app

# کپی فایل‌های پروژه
COPY packages/contracts/ /packages/contracts/
COPY apps/pdf-worker/ ./

# کامپایل Protobuf
RUN mkdir -p gen/pdf_v1
RUN protoc --proto_path=/packages/contracts --go_out=./gen/pdf_v1 --go_opt=paths=source_relative pdf_events.proto

# دانلود پکیج‌ها با استفاده از کشِ هارد دیسک (BuildKit Cache)
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod tidy

# بیلد نهایی با استفاده از کش کامپایلر گو
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o /pdf-worker ./cmd/main.go

# Runtime Stage
FROM alpine:latest
WORKDIR /
COPY --from=builder /pdf-worker /pdf-worker

CMD ["/pdf-worker"]
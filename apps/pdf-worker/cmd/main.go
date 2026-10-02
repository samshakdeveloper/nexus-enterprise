package main

import (
	"context"
	"log"
	"os"

	"github.com/IBM/sarama"
	"nexus-enterprise/pdf-worker/internal/adapters/generator"
	"nexus-enterprise/pdf-worker/internal/adapters/kafka"
	storageAdapter "nexus-enterprise/pdf-worker/internal/adapters/storage"
	"nexus-enterprise/pdf-worker/internal/usecase"
)

func main() {
	log.Println("Starting Nexus PDF Worker Enterprise (Go)...")

	kafkaBroker := getEnv("KAFKA_BROKER", "kafka:29092")
	s3Endpoint := getEnv("S3_ENDPOINT", "minio:9000")
	s3AccessKey := getEnv("S3_ACCESS_KEY", "nexus_admin")
	s3SecretKey := getEnv("S3_SECRET_KEY", "nexus_password123")
	s3BucketName := getEnv("S3_BUCKET_NAME", "nexus-pdfs")

	// ۱. آداپتور ساخت PDF
	pdfAdapter := generator.NewGoFPDFAdapter()

	// ۲. آداپتور ذخیره‌سازی MinIO/S3
	s3Adapter, err := storageAdapter.NewS3Adapter(s3Endpoint, s3AccessKey, s3SecretKey, s3BucketName, false)
	if err != nil {
		log.Fatalf("Failed to initialize S3 Adapter: %v", err)
	}

	// ۳. ساخت UseCase اصلی
	pdfUseCase := usecase.NewGeneratePDFUseCase(pdfAdapter, s3Adapter)

	// ۴. ساخت Kafka Producer
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	producer, err := sarama.NewSyncProducer([]string{kafkaBroker}, config)
	if err != nil {
		log.Fatalf("Failed to start Kafka producer: %v", err)
	}
	defer producer.Close()

	// ۵. ساخت و استارت Kafka Consumer
	consumer := kafka.NewKafkaPDFConsumer(pdfUseCase, producer, []string{kafkaBroker})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		log.Printf("Connected to Kafka at %s. Listening for 'nexus.pdf.generate'...", kafkaBroker)
		if err := consumer.Start(ctx); err != nil {
			log.Fatalf("Error running consumer: %v", err)
		}
	}()

	select {}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
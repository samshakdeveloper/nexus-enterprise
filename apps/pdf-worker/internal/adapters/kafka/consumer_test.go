package kafka_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/IBM/sarama"
	"github.com/IBM/sarama/mocks"

	"nexus-enterprise/pdf-worker/internal/adapters/kafka"
	"nexus-enterprise/pdf-worker/internal/usecase"
)

// MockPDFGenerator اختصاصی برای تست کافکا
type MockPDFGenerator struct {
	ShouldFail bool
}

func (m *MockPDFGenerator) GenerateFromHTML(ctx context.Context, htmlContent string) ([]byte, error) {
	if m.ShouldFail {
		return nil, errors.New("generator error")
	}
	return []byte("%PDF-1.4 dummy content"), nil
}

// MockStorage اختصاصی برای تست کافکا با پیاده‌سازی کامل StoragePort
type MockStorage struct {
	ShouldUploadFail bool
	ShouldURLFail    bool
}

func (m *MockStorage) UploadPDF(ctx context.Context, objectName string, pdfData []byte) error {
	if m.ShouldUploadFail {
		return errors.New("s3 upload error")
	}
	return nil
}

func (m *MockStorage) GeneratePresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	if m.ShouldURLFail {
		return "", errors.New("presigned url error")
	}
	return "http://localhost:9000/pdf-bucket/" + objectName + "?token=dummy", nil
}

func TestKafkaPDFConsumer_HandleMessage_Fallback(t *testing.T) {
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	mockProducer := mocks.NewSyncProducer(t, config)

	// انتظار ارسال پیام روی موضوع nexus.pdf.generated
	mockProducer.ExpectSendMessageAndSucceed()

	// ساخت UseCase با Mocks
	mockGen := &MockPDFGenerator{}
	mockStorage := &MockStorage{}
	uc := usecase.NewGeneratePDFUseCase(mockGen, mockStorage)

	consumer := kafka.NewKafkaPDFConsumer(uc, mockProducer, []string{"localhost:9092"})

	msg := &sarama.ConsumerMessage{
		Topic: "nexus.pdf.generate",
		Value: []byte("<h1>Test Document</h1>"),
	}

	err := consumer.HandleMessage(context.Background(), msg)
	if err != nil {
		t.Fatalf("expected handle message to succeed, got %v", err)
	}
}

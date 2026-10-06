package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"nexus-enterprise/pdf-worker/internal/usecase"
)

// MockPDFGenerator
type MockPDFGenerator struct {
	ShouldFail bool
}

func (m *MockPDFGenerator) GenerateFromHTML(ctx context.Context, html string) ([]byte, error) {
	if m.ShouldFail {
		return nil, errors.New("pdf creation error")
	}
	return []byte("%PDF-1.4 test bytes"), nil
}

// MockStorage
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
	return "https://minio.local/nexus-pdfs/invoices/test-123.pdf", nil
}

func TestGeneratePDFUseCase_Execute_Success(t *testing.T) {
	mockGen := &MockPDFGenerator{ShouldFail: false}
	mockStorage := &MockStorage{ShouldUploadFail: false, ShouldURLFail: false}

	uc := usecase.NewGeneratePDFUseCase(mockGen, mockStorage)

	res, err := uc.Execute(context.Background(), "pdf-101", "<h1>Invoice</h1>")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if res.PdfID != "pdf-101" {
		t.Errorf("expected PdfID pdf-101, got %s", res.PdfID)
	}

	if res.FileSize == 0 {
		t.Errorf("expected FileSize > 0, got 0")
	}

	if res.FileKey != "invoices/pdf-101.pdf" {
		t.Errorf("expected FileKey invoices/pdf-101.pdf, got %s", res.FileKey)
	}
}

func TestGeneratePDFUseCase_Execute_GenerationError(t *testing.T) {
	mockGen := &MockPDFGenerator{ShouldFail: true}
	mockStorage := &MockStorage{}

	uc := usecase.NewGeneratePDFUseCase(mockGen, mockStorage)

	_, err := uc.Execute(context.Background(), "pdf-102", "<h1>Invoice</h1>")

	if err == nil {
		t.Fatal("expected error when generator fails, got nil")
	}
}

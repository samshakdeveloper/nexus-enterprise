package usecase

import (
	"context"
	"fmt"
	"time"

	"nexus-enterprise/pdf-worker/internal/ports"
)

type GeneratePDFUseCase struct {
	pdfGen  ports.PDFGeneratorPort
	storage ports.StoragePort
}

func NewGeneratePDFUseCase(pdfGen ports.PDFGeneratorPort, storage ports.StoragePort) *GeneratePDFUseCase {
	return &GeneratePDFUseCase{
		pdfGen:  pdfGen,
		storage: storage,
	}
}

type PDFResult struct {
	PdfID        string
	FileKey      string
	PresignedURL string
	FileSize     int64
}

func (uc *GeneratePDFUseCase) Execute(ctx context.Context, pdfID string, htmlContent string) (*PDFResult, error) {
	// ۱. تولید PDF
	pdfBytes, err := uc.pdfGen.GenerateFromHTML(ctx, htmlContent)
	if err != nil {
		return nil, fmt.Errorf("pdf generation failed: %w", err)
	}

	// ۲. ساخت نام فایل در S3
	fileKey := fmt.Sprintf("invoices/%s.pdf", pdfID)

	// ۳. آپلود در MinIO (Claim-Check)
	if err := uc.storage.UploadPDF(ctx, fileKey, pdfBytes); err != nil {
		return nil, fmt.Errorf("s3 upload failed: %w", err)
	}

	// ۴. ساخت Presigned URL (با اعتبار ۲۴ ساعته)
	presignedURL, err := uc.storage.GeneratePresignedURL(ctx, fileKey, 24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to generate url: %w", err)
	}

	return &PDFResult{
		PdfID:        pdfID,
		FileKey:      fileKey,
		PresignedURL: presignedURL,
		FileSize:     int64(len(pdfBytes)),
	}, nil
}
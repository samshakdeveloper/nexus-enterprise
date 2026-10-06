package ports

import (
	"context"
	"time"
)

type StoragePort interface {
	UploadPDF(ctx context.Context, objectName string, pdfData []byte) error
	GeneratePresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error)
}

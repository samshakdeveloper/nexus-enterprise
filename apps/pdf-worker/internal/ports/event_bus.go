package ports

import "context"

type PDFCommandProcessor interface {
	ProcessGenerateCommand(ctx context.Context, pdfID string, htmlContent string) ([]byte, error)
}

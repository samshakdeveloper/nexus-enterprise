package ports

import "context"

type PDFGeneratorPort interface {
	GenerateFromHTML(ctx context.Context, html string) ([]byte, error)
}

package generator

import (
	"bytes"
	"context"
	"github.com/jung-kurt/gofpdf"
	"nexus-enterprise/pdf-worker/internal/ports"
)

type GoFPDFAdapter struct{}

func NewGoFPDFAdapter() ports.PDFGeneratorPort {
	return &GoFPDFAdapter{}
}

func (a *GoFPDFAdapter) GenerateFromHTML(ctx context.Context, html string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Nexus Enterprise - Generated PDF")
	pdf.Ln(12)
	pdf.SetFont("Arial", "", 12)
	pdf.MultiCell(0, 10, html, "", "", false)

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

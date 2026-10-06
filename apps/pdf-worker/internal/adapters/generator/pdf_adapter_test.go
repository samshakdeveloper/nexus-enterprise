package generator_test

import (
	"bytes"
	"context"
	"testing"

	"nexus-enterprise/pdf-worker/internal/adapters/generator"
)

func TestGoFPDFAdapter_GenerateFromHTML_Success(t *testing.T) {
	adapter := generator.NewGoFPDFAdapter()

	htmlInput := "Hello World! Nexus Enterprise PDF Generator."
	pdfBytes, err := adapter.GenerateFromHTML(context.Background(), htmlInput)

	if err != nil {
		t.Fatalf("expected no error during PDF generation, got: %v", err)
	}

	if len(pdfBytes) == 0 {
		t.Fatal("expected generated PDF bytes to be non-empty")
	}

	// بررسی وجود Header استاندارد PDF (%PDF)
	if !bytes.HasPrefix(pdfBytes, []byte("%PDF")) {
		t.Errorf("expected output to start with %%PDF header, got %s", string(pdfBytes[:4]))
	}
}

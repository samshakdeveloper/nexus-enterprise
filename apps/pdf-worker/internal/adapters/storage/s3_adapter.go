package storage

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"nexus-enterprise/pdf-worker/internal/ports"
)

type S3Adapter struct {
	client     *minio.Client
	bucketName string
}

func NewS3Adapter(endpoint, accessKey, secretKey, bucketName string, useSSL bool) (ports.StoragePort, error) {
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize minio client: %w", err)
	}

	return &S3Adapter{
		client:     minioClient,
		bucketName: bucketName,
	}, nil
}

func (s *S3Adapter) UploadPDF(ctx context.Context, objectName string, pdfData []byte) error {
	reader := bytes.NewReader(pdfData)
	objectSize := int64(len(pdfData))

	_, err := s.client.PutObject(ctx, s.bucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: "application/pdf",
	})
	if err != nil {
		return fmt.Errorf("failed to upload pdf to minio: %w", err)
	}

	return nil
}

func (s *S3Adapter) GeneratePresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := s.client.PresignedGetObject(ctx, s.bucketName, objectName, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned url: %w", err)
	}

	return presignedURL.String(), nil
}

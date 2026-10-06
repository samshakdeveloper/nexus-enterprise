package kafka

import (
	"context"
	"log"

	"github.com/IBM/sarama"
	"google.golang.org/protobuf/proto"

	pb "nexus-enterprise/pdf-worker/gen/pdf_v1"
	"nexus-enterprise/pdf-worker/internal/usecase"
)

type KafkaPDFConsumer struct {
	useCase  *usecase.GeneratePDFUseCase
	producer sarama.SyncProducer
	brokers  []string
	groupID  string
	topic    string
}

func NewKafkaPDFConsumer(useCase *usecase.GeneratePDFUseCase, producer sarama.SyncProducer, brokers []string) *KafkaPDFConsumer {
	return &KafkaPDFConsumer{
		useCase:  useCase,
		producer: producer,
		brokers:  brokers,
		groupID:  "pdf-worker-group",
		topic:    "nexus.pdf.generate",
	}
}

func (k *KafkaPDFConsumer) Start(ctx context.Context) error {
	config := sarama.NewConfig()
	config.Consumer.Offsets.Initial = sarama.OffsetOldest

	group, err := sarama.NewConsumerGroup(k.brokers, k.groupID, config)
	if err != nil {
		return err
	}
	defer group.Close()

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
			err := group.Consume(ctx, []string{k.topic}, k)
			if err != nil {
				log.Printf("Error from consumer group: %v", err)
			}
		}
	}
}

func (k *KafkaPDFConsumer) Setup(sarama.ConsumerGroupSession) error   { return nil }
func (k *KafkaPDFConsumer) Cleanup(sarama.ConsumerGroupSession) error { return nil }

func (k *KafkaPDFConsumer) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		log.Printf("Message received on topic %s [partition %d]", msg.Topic, msg.Partition)
		if err := k.HandleMessage(session.Context(), msg); err != nil {
			log.Printf("Error processing message: %v", err)
		} else {
			session.MarkMessage(msg, "")
		}
	}
	return nil
}

func (k *KafkaPDFConsumer) HandleMessage(ctx context.Context, msg *sarama.ConsumerMessage) error {
	cmd := &pb.GeneratePdfCommand{}

	if err := proto.Unmarshal(msg.Value, cmd); err != nil {
		log.Printf("Received raw string/JSON message: %s", string(msg.Value))
		cmd.Id = "test-id"
		cmd.HtmlContent = string(msg.Value)
	}

	log.Printf("Processing PDF Request ID: %s", cmd.GetId())

	// اجرای UseCase اصلی
	result, err := k.useCase.Execute(ctx, cmd.GetId(), cmd.GetHtmlContent())
	if err != nil {
		log.Printf("Error in PDF pipeline: %v", err)
		return err
	}

	log.Printf("PDF generated and uploaded successfully! FileKey: %s, URL: %s", result.FileKey, result.PresignedURL)

	// ساخت پاسخ بر اساس Claim-Check Pattern
	response := &pb.PdfGeneratedEvent{
		Id:      result.PdfID,
		FileUrl: result.PresignedURL,
		Success: true,
	}

	outBytes, err := proto.Marshal(response)
	if err != nil {
		return err
	}

	_, _, err = k.producer.SendMessage(&sarama.ProducerMessage{
		Topic: "nexus.pdf.generated",
		Key:   sarama.StringEncoder(cmd.GetId()),
		Value: sarama.ByteEncoder(outBytes),
	})

	return err
}

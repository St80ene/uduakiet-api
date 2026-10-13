import { Test, TestingModule } from '@nestjs/testing';
import { OutboxController } from './outbox.controller';
import { OutboxProcessorService } from './outbox_processor.service';

describe('OutboxController', () => {
  let controller: OutboxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboxController],
      providers: [OutboxProcessorService],
    }).compile();

    controller = module.get<OutboxController>(OutboxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

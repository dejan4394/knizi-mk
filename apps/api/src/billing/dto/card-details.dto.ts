import {
  IsCreditCard,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

// Податоци од картичка што корисникот ги внесува ЕДНАШ при активација на ПРО.
// Ги праќаме до mock-от на банката за токенизација - самите не ги чуваме.
export class CardDetailsDto {
  @IsCreditCard({ message: 'Невалиден број на картичка.' })
  pan!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @IsInt()
  @Min(2000)
  expiryYear!: number;

  @IsString()
  @Length(3, 4, { message: 'CVV мора да има 3 или 4 цифри.' })
  cvv!: string;

  @IsString()
  @Length(2, 100)
  cardHolder!: string;
}

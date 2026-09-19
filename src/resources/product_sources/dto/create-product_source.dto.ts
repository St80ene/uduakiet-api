import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductSourceDto {
  @IsNotEmpty({ message: 'Product id is required.' })
  @IsString()
  product_id!: string;

  @IsNotEmpty({ message: 'Supplier id is required.' })
  @IsString()
  supplier_id!: string;
}

import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class UserAuth {
  @PrimaryColumn({ type: 'varchar', length: 36, unique: true })
  user_id?: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
    nullable: true,
    default: null,
  })
  @Exclude()
  password?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  @Exclude()
  refresh_token?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  @Exclude()
  password_reset_token?: string | null;

  @Column({ type: 'datetime', nullable: true })
  password_reset_expires_at?: Date | null;

  @Column({ type: 'boolean', default: false })
  is_email_verified!: boolean;

  @Column({ type: 'varchar', select: false, length: 255, nullable: true })
  @Exclude()
  email_verification_token?: string | null;

  @Column({ type: 'datetime', nullable: true })
  email_verification_expires_at?: Date | null;

  @Column({ type: 'int', default: 0, nullable: true })
  failed_login_attempts?: number | null;

  @Column({ type: 'datetime', nullable: true })
  locked_until?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  last_login_at?: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  last_login_ip?: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}

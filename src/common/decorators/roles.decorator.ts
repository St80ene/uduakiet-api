import { Reflector } from '@nestjs/core';
import { UserRole } from '../enum/user_role.enum';

export const Roles = Reflector.createDecorator<UserRole[]>();

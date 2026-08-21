import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PERMISSION_KEY } from '../decorators/skip-permission-check.decorator';
import { PermissionsService } from '../../permissions/permissions.service';
import { RequestWithCompany } from './company-scope.guard';

/**
 * Must run after CompanyScopeGuard, which populates request.companyContext.roleKey.
 * Authorizes by matching the resolved Express route pattern + HTTP method
 * against the role's granted Api records - not a per-handler permission key.
 */
@Injectable()
export class ApiPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<RequestWithCompany>();
    const roleKey = request.companyContext?.roleKey;
    if (!roleKey) {
      throw new ForbiddenException('Role missing');
    }

    const routePattern: string | undefined = (
      request as unknown as { route?: { path?: string } }
    ).route?.path;
    if (!routePattern) {
      throw new ForbiddenException('Unable to resolve route');
    }

    const allowed = await this.permissionsService.checkApiPermission(
      roleKey,
      routePattern,
      request.method,
    );
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}

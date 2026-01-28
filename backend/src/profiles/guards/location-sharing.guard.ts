import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ProfilesService } from '../profiles.service';

@Injectable()
export class LocationSharingGuard implements CanActivate {
  constructor(private profilesService: ProfilesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const profile = await this.profilesService.getProfile(user.id);
    return profile.locationSharingEnabled;
  }
}

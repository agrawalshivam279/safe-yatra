/**
 * Safe Yatra — Backend Spatial Server
 * SOS Proximity Matcher (Volunteer Responder Assignment Engine).
 */

import { volunteerService } from '../volunteer/volunteer.service';
import { SOSMatchResult } from './sos.types';

export class SOSMatcher {
  /**
   * Matches and ranks nearby on-duty volunteers within a specified radius (default 5km).
   */
  public async matchVolunteers(
    lat: number,
    lng: number,
    radiusMeters = 5000,
    limit = 10
  ): Promise<SOSMatchResult> {
    const volunteers = await volunteerService.findNearbyVolunteers(
      lat,
      lng,
      radiusMeters,
      limit
    );

    const nearestVolunteer = volunteers.length > 0 ? volunteers[0] : undefined;
    const nearestEtaSeconds = nearestVolunteer?.estimatedEtaSeconds;

    return {
      volunteerCount: volunteers.length,
      volunteers,
      nearestVolunteer,
      nearestEtaSeconds,
    };
  }
}

export const sosMatcher = new SOSMatcher();
export default sosMatcher;

export namespace SP {
  interface UserIdInfo {
    NameId?: string | null;
    NameIdIssuer?: string | null;
  }

  type Principal = {
    Id: number;
    IsHiddenInUI: boolean;
    LoginName?: string | null;
    Title?: string | null;
    PrincipalType: number;
  };

  type User = Principal & {
    AadObjectId?: UserIdInfo | null;
    Email?: string | null;
    EmailWithFallback?: string | null;
    Expiration?: string | null;
    HexCid?: string | null;
    IsEmailAuthenticationGuestUser: boolean;
    IsShareByEmailGuestUser: boolean;
    IsSiteAdmin: boolean;
    UserId?: UserIdInfo | null;
    UserPrincipalName?: string | null;
  };
}

import { Body, Controller, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { SkipResponseInterceptor } from 'src/common/interfaces/skip-response-interceptor';
import { AuthService } from './auth.service';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';


@ApiTags('oauth2')
@Controller()
export class AuthController {
 
constructor(private readonly authService: AuthService) {}

@ApiOperation({ summary: 'Generate an OAuth2 token' })
@ApiHeader({
  name: 'Authorization',
  description: 'Basic base64(clientId:clientSecret) credentials.',
  required: true,
})
@ApiQuery({
  name: 'grant_type',
  required: false,
  example: 'client_credentials',
  description: 'OAuth2 grant type. Can be supplied as query or request body.',
})
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      grant_type: {
        type: 'string',
        example: 'client_credentials',
      },
    },
  },
})
@ApiResponse({
  status: 201,
  description: 'Bearer token generated successfully.',
})
@ApiResponse({
  status: 401,
  description: 'Missing or malformed Authorization header.',
})
@Post('oauth/token')
  @SkipResponseInterceptor()
  getToken(@Req() req: Request, @Query('grant_type') grantType: string, @Body('grant_type') bodyGrantType: string) {

      const finalGrantType = grantType?.trim() || bodyGrantType?.trim();
    if (finalGrantType !== 'client_credentials') {
      console.log(`Unsupported grant_type: ${finalGrantType}`);
      throw new Error('Unsupported grant_type');
    }

    const authHeader = req.headers['authorization'] || '';
    const [scheme, credentials] = authHeader.split(/\s+/);
    

    if (scheme?.toLowerCase() !== 'basic' || !credentials) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    // Decode Base64 clientId:clientSecret
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [clientId, clientSecret] = decoded.split(':');
    console.log(`Received token request with clientId: ${clientId} clientSecret: ${clientSecret}`);

    const token = this.authService.generateToken(clientId, clientSecret);
    console.log(`Generated token: ${token.token} expiresAt: ${new Date(token.expiresAt).toISOString()}`);
    return {
      access_token: token.token,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

}

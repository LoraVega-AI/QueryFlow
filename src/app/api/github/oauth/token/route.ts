// GitHub OAuth Token Exchange API Route
// Exchange authorization code for access token

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_github_client_id';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        state
      })
    });

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed:', tokenResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error);
      return NextResponse.json(
        { error: tokenData.error_description || 'OAuth error' },
        { status: 400 }
      );
    }

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info:', userResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    const userData = await userResponse.json();

    // In a real implementation, you would:
    // 1. Store the token securely (encrypted in database/session)
    // 2. Create or update user session
    // 3. Set secure HTTP-only cookies

    const response = {
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        type: userData.type,
        company: userData.company,
        location: userData.location,
        bio: userData.bio
      },
      token: {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        refresh_token_expires_in: tokenData.refresh_token_expires_in
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GitHub OAuth token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error during OAuth' },
      { status: 500 }
    );
  }
}

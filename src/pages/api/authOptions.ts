import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider, {
  LinkedInProfile,
} from "next-auth/providers/linkedin";
import GitHubProvider from "next-auth/providers/github";
import process from "process";

var backend_token: null = null;
var social_provider: null = null;

const fetchBackEndData = async (
  provider: any,
  authToken: any,
  userObject: any
) => {
  try {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL + "" + provider + "/";
    console.log(url);
    const data = {
      userObject,
      provider,
      auth_token: authToken,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch data from the backend");
    }
    const responseData = await response.json();

    return responseData;
  } catch (error) {
    console.error("Error fetching data from backend:", error);
    return null;
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      client: { token_endpoint_auth_method: "client_secret_post" },
      issuer: "https://www.linkedin.com",
      profile: (profile: LinkedInProfile) => ({
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      }),
      wellKnown:
        "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      accessTokenUrl: "https://github.com/login/oauth/access_token",
      profileUrl: "https://api.github.com/user",
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          gh_username: profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 1 * 24 * 60 * 60,
  },
  jwt: {},
  callbacks: {
    async signIn(params: { user: any; account: any }) {
      const { user, account } = params;
      let auth_token = account?.id_token;
      const { access_token, provider } = account;
      let backendUserData = await fetchBackEndData(
        provider,
        auth_token,
        user
      );
      user.jwt = backend_token = backendUserData?.token;
      social_provider = provider;
   
      return {
        ...user,
        session: {
          ...user.session,
          jwt: backendUserData?.token
        }
      };
    },
 
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...(session || {}),
        accessToken: token.accessToken,
        token : backend_token,
        provider : social_provider
      };
    },
  },
  pages: {
    signIn: `/Careers`,
  },
};

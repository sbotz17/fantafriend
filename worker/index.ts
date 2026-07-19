export default {
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "FantaFriend API",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "Endpoint not found" },
        { status: 404 },
      );
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

package com.forgefit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/** Small, bounded, single-process limiter. Use an edge limiter for a public deployment. */
final class AuthRateLimitFilter extends OncePerRequestFilter {
    private record Window(long start, int count) {}
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private static final long WINDOW = Duration.ofMinutes(10).toMillis();
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getServletPath();
        if (!request.getMethod().equals("POST") || !(path.equals("/api/auth/login") || path.equals("/api/auth/register"))) {
            chain.doFilter(request, response); return;
        }
        long now = System.currentTimeMillis();
        if (windows.size() > 5000) windows.entrySet().removeIf(e -> now - e.getValue().start() > WINDOW);
        String key = request.getRemoteAddr();
        if (!windows.containsKey(key) && windows.size() > 10000) {
            reject(response); return;
        }
        Window window = windows.compute(key, (k, old) -> old == null || now - old.start() >= WINDOW
            ? new Window(now, 1) : new Window(old.start(), old.count() + 1));
        if (window.count() > 30) { reject(response); return; }
        chain.doFilter(request, response);
    }
    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(429); response.setContentType("application/json");
        response.setHeader("Retry-After", "600");
        response.getWriter().write("{\"message\":\"Too many sign-in attempts. Try again in 10 minutes.\"}");
    }
}

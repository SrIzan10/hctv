import { chatMetricsRegistry } from '../../utils/chat/metrics';
import { webMetricsRegistry } from '../../utils/webMetrics';
import { hasMetricsAuth } from '../../utils/basicAuth';

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production' && !hasMetricsAuth(event)) {
    setResponseStatus(event, 401);
    setResponseHeader(event, 'WWW-Authenticate', 'Basic');
    return 'Authentication required';
  }

  // both registries use distinct metric prefixes, so the text output can be joined as is
  const [web, chat] = await Promise.all([
    webMetricsRegistry.metrics(),
    chatMetricsRegistry.metrics(),
  ]);
  setResponseHeader(event, 'Content-Type', webMetricsRegistry.contentType);
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return `${web}\n${chat}`;
});

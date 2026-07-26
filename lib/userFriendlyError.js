const NETWORK_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'ERR_NETWORK']);

const toUserMessage = (error, context = 'generic') => {
  const message = typeof error === 'string' ? error : error?.message ?? '';
  const code = error?.code ?? '';
  const status = error?.response?.status;

  if (code === 'ETIMEDOUT' || /timeout/i.test(message)) {
    return 'This is taking longer than expected. Please try again.';
  }

  if (NETWORK_CODES.has(code) || /network|fetch failed|econn/i.test(message)) {
    return "We couldn't connect right now. Check your internet and try again.";
  }

  if (status === 429 || /too many requests/i.test(message)) {
    return "We're getting a lot of requests. Please wait a moment and try again.";
  }

  if (status === 503 || /not configured|missing base_url|missing api_key/i.test(message)) {
    return 'MovieSphere is temporarily unavailable. Please try again later.';
  }

  if (context === 'download') {
    if (
      status === 404 ||
      /no stream url|stream resolver timed out|embed providers|hls playlist/i.test(message)
    ) {
      return "This title isn't available for download right now. Try watching online instead.";
    }
    return "Download didn't complete. Please try again.";
  }

  if (context === 'stream') {
    return 'Download was interrupted. Please try again.';
  }

  if (status === 404) {
    return "We couldn't find what you're looking for.";
  }

  if (status === 400 || /path not allowed/i.test(message)) {
    return "That request couldn't be completed.";
  }

  return "We couldn't load this content right now. Please try again.";
};

// ponytail: sanity check — run with `node lib/userFriendlyError.js`
if (require.main === module) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  assert(
    toUserMessage({ code: 'ECONNRESET' }, 'proxy').includes("couldn't connect"),
    'network mapping'
  );
  assert(
    toUserMessage({ message: 'Stream resolver timed out' }, 'download').includes("isn't available"),
    'download mapping'
  );
  assert(!toUserMessage({ message: 'x' }, 'proxy').includes('ECONN'), 'no leak');
  console.log('userFriendlyError ok');
}

module.exports = { toUserMessage };

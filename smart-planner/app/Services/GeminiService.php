<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private array $apiKeys = [];
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

    // ── Updated model list with newest free tier models ───────────────────
   private array $models = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-lite-001',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
];

    public function __construct()
    {
        $keys = config('services.gemini.key');
        if (is_string($keys)) {
            $this->apiKeys = array_values(array_filter(array_map('trim', explode(',', $keys))));
        } elseif (is_array($keys)) {
            $this->apiKeys = $keys;
        }
    }

    // ── List available models (for debugging) ─────────────────────────────
    public function listModels(): array
    {
        $key = $this->apiKeys[0] ?? '';
        $res = Http::get("{$this->baseUrl}?key={$key}");
        return $res->json('models') ?? [];
    }

    // ── Core API Call ──────────────────────────────────────────────────────
    public function chat(string $system, string $user, int $maxTokens = 2000): ?string
    {
        if (empty($this->apiKeys)) {
            Log::error('Gemini API keys are missing.');
            return null;
        }

        $keys = $this->apiKeys;
        shuffle($keys); // load balance across keys

        foreach ($keys as $key) {
            foreach ($this->models as $model) {
                $result = $this->callModel($model, $key, $system, $user, $maxTokens);
                if ($result !== null) {
                    Log::info("Gemini success with model: {$model} using a rotated key");
                    return $result;
                }
            }
        }

        Log::error('All Gemini models and keys failed.');
        return null;
    }

    private function callModel(string $model, string $key, string $system, string $user, int $maxTokens): ?string
    {
        try {
            $url = "{$this->baseUrl}/{$model}:generateContent?key={$key}";

            $response = Http::timeout(60)->post($url, [
                'system_instruction' => [
                    'parts' => [['text' => $system]],
                ],
                'contents' => [
                    [
                        'role'  => 'user',
                        'parts' => [['text' => $user]],
                    ],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $maxTokens,
                    'temperature'     => 0.7,
                ],
            ]);

            Log::info("Gemini [{$model}] status: " . $response->status());

            if ($response->status() === 429) {
                Log::warning("Gemini [{$model}] quota exceeded, trying next model.");
                return null;
            }

            if ($response->status() === 404) {
                Log::warning("Gemini [{$model}] not found, trying next model.");
                return null;
            }

            if ($response->failed()) {
                Log::warning("Gemini [{$model}] failed: " . $response->body());
                return null;
            }

            $text = $response->json('candidates.0.content.parts.0.text');

            if (empty($text)) {
                Log::warning("Gemini [{$model}] empty response");
                return null;
            }

            return $text;

        } catch (\Exception $e) {
            Log::error("Gemini [{$model}] exception: " . $e->getMessage());
            return null;
        }
    }

    // ── Parse JSON ─────────────────────────────────────────────────────────
    public function parseJson(string $text): ?array
    {
        $clean   = preg_replace('/```json\s*|\s*```/', '', $text);
        $clean   = trim($clean);
        $decoded = json_decode($clean, true);

        if (!is_array($decoded)) {
            // Try extracting JSON from response
            preg_match('/\{.*\}/s', $clean, $matches);
            if (!empty($matches[0])) {
                $decoded = json_decode($matches[0], true);
            }
        }

        return is_array($decoded) ? $decoded : null;
    }

    // ── Single Combined Call ───────────────────────────────────────────────
    public function generateFullPlan(array $subjects, string $today, array $blockedTimes = []): ?array
{
    $subjectList = collect($subjects)->map(function ($s) {
        return "{$s['name']} (deadline: {$s['deadline']}, difficulty: {$s['difficulty']}/4, estimated: {$s['estimated_hours']}h)";
    })->implode('; ');

    // ── Format blocked times for prompt ───────────────────────────────────
    // ── Format blocked times for prompt ───────────────────────────────────
$blockedStr = '';
if (!empty($blockedTimes)) {
    $blockedStr = "\n\nBLOCKED / UNAVAILABLE TIMES (never schedule during these):";
    foreach ($blockedTimes as $b) {
        if (!($b['is_active'] ?? true)) continue;
        $days    = implode(', ', $b['days']);
        $start   = $b['start_time'];
        $end     = $b['end_time'];

        // Handle overnight blocks (e.g. 22:00 to 07:00)
        $isOvernight = $start > $end;
        if ($isOvernight) {
            $blockedStr .= "\n- {$b['label']} (OVERNIGHT): {$days} from {$start} to midnight AND midnight to {$end} next morning";
        } else {
            $blockedStr .= "\n- {$b['label']}: {$days} from {$start} to {$end}";
        }
    }
    $blockedStr .= "\nCRITICAL: Never place ANY session inside these time ranges.";
}

    $system = "You are an academic study planner AI. You MUST respond with ONLY a valid JSON object. No markdown, no explanation, no text before or after the JSON.";

    $user = "Today is {$today}. Subjects: {$subjectList}.{$blockedStr}

Return ONLY this JSON (no markdown, no extra text):
{
  \"schedule\": {
    \"summary\": \"Brief summary of the plan\",
    \"days\": [
      {
        \"date\": \"YYYY-MM-DD\",
        \"sessions\": [
          {
            \"subject\": \"EXACT name from subjects list\",
            \"time\": \"HH:MM\",
            \"duration\": 60,
            \"priority\": \"high/medium/low\",
            \"note\": \"Brief instruction\"
          }
        ]
      }
    ]
  },
  \"stress\": {
    \"level\": \"moderate\",
    \"score\": 45,
    \"message\": \"Personalized message.\",
    \"tips\": [\"tip 1\", \"tip 2\", \"tip 3\"]
  },
  \"insight\": \"2-3 sentences of warm personalized advice.\"
}

STRICT STRESS CALCULATION RULES (FOLLOW EXACTLY):
- Calculate stress score based on these EXACT weights:
  * Each subject: +10 points (max 40)
  * Deadline within 7 days: +15 points per subject
  * Deadline overdue: +25 points per subject
  * Difficulty (easy=0, medium=10, hard=20, very_hard=30)
  * Study hours per day over 4h: +5 per extra hour
  * Total weekly hours over 20h: +20 points
  * Rest days missing: +15 points

- Stress levels based on SCORE ONLY:
  * low = 0-35
  * moderate = 36-60
  * high = 61-80
  * critical = 81-100

- Example calculation:
  * 3 subjects (30) + deadlines in 7 days (15) + medium difficulty (10) + 25h/week (20) = 75 → high

- message: Short personalized advice based on the score
- tips: 3 specific actionable wellness tips

Return ONLY JSON, no other text.";

    $response = $this->chat($system, $user, 3000);
    if (!$response) return null;

    $result = $this->parseJson($response);

    if (!$result) {
        preg_match('/\{.*\}/s', $response, $matches);
        if (!empty($matches[0])) {
            $result = json_decode($matches[0], true);
        }
    }

    return $result;
}
// ── Generate Quiz from text content ───────────────────────────────────────
public function generateQuiz(
    string $content,
    string $contentType,
    string $title,
    int    $numQuestions = 10,
    string $difficulty   = 'medium'
): ?array {
    $system = "You are an expert quiz generator for students. Generate multiple choice questions based on study material. Return ONLY valid JSON with no markdown, no explanation.";

    $prompt = "Generate exactly {$numQuestions} multiple choice questions from this study material.
Topic: {$title}
Difficulty: {$difficulty} (easy=recall, medium=understanding, hard=application/analysis)

Return ONLY this JSON:
{
  \"title\": \"Quiz: {$title}\",
  \"questions\": [
    {
      \"id\": 1,
      \"question\": \"Clear specific question?\",
      \"options\": [\"Option A text\", \"Option B text\", \"Option C text\", \"Option D text\"],
      \"correct_index\": 0,
      \"explanation\": \"Brief reason why this is correct.\"
    }
  ]
}

Rules:
- Exactly 4 options per question
- correct_index is 0-based integer
- Questions must be specific and test real understanding
- All questions must come directly from the material
- Explanations must be 1-2 sentences
- Return ONLY the JSON object";

    if ($contentType === 'txt') {
        $fullPrompt = "Study Material:\n\n{$content}\n\n{$prompt}";
        $response   = $this->chat($system, $fullPrompt, 4000);
    } else {
        // PDF or image — use multimodal
        $response = $this->chatWithFile($content, $contentType, $system, $prompt, 4000);
    }

    if (!$response) return null;

    $result = $this->parseJson($response);
    if (!$result) {
        preg_match('/\{.*\}/s', $response, $matches);
        if (!empty($matches[0])) {
            $result = json_decode($matches[0], true);
        }
    }
    return $result;
}

// ── Multimodal call (file + text) ─────────────────────────────────────────
private function chatWithFile(
    string $base64Data,
    string $mimeType,
    string $system,
    string $user,
    int    $maxTokens
): ?string {
    $keys = $this->apiKeys;
    shuffle($keys);

    foreach ($keys as $key) {
        foreach ($this->models as $model) {
            try {
                $url = "{$this->baseUrl}/{$model}:generateContent?key={$key}";

            $response = Http::timeout(120)->post($url, [
                'system_instruction' => [
                    'parts' => [['text' => $system]],
                ],
                'contents' => [
                    [
                        'role'  => 'user',
                        'parts' => [
                            [
                                'inline_data' => [
                                    'mime_type' => $mimeType,
                                    'data'      => $base64Data,
                                ],
                            ],
                            ['text' => $user],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $maxTokens,
                    'temperature'     => 0.4,
                ],
            ]);

            Log::info("Gemini file [{$model}] status: " . $response->status());

            if ($response->failed()) {
                Log::warning("Gemini file [{$model}] failed: " . $response->body());
                continue;
            }

            $text = $response->json('candidates.0.content.parts.0.text');
            if (!empty($text)) return $text;

        } catch (\Exception $e) {
            Log::error("Gemini file [{$model}] exception: " . $e->getMessage());
        }
    }
    }
    return null;
}
// ── Generate quiz from MULTIPLE notes ─────────────────────────────────────
public function generateQuizFromMultiple(
    array  $notes,       // [['title'=>'...','type'=>'txt|pdf|img','content'=>'...','mime'=>'...'], ...]
    string $combinedTitle,
    int    $numQuestions = 10,
    string $difficulty   = 'medium'
): ?array {
    $system = "You are an expert quiz generator for students. Generate multiple choice questions covering ALL provided study materials. Return ONLY valid JSON, no markdown.";

    $prompt = "Generate exactly {$numQuestions} multiple choice questions covering the provided study materials.
Combined Topic: {$combinedTitle}
Difficulty: {$difficulty}
Number of source materials: " . count($notes) . "

Spread questions across ALL materials — do not focus only on one.

Return ONLY this JSON:
{
  \"title\": \"Quiz: {$combinedTitle}\",
  \"questions\": [
    {
      \"id\": 1,
      \"question\": \"Specific question from the material?\",
      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],
      \"correct_index\": 0,
      \"explanation\": \"Why this answer is correct.\",
      \"source\": \"Note title this came from\"
    }
  ]
}

Rules:
- Exactly 4 options, correct_index is 0-based
- Cover all provided materials proportionally
- Questions test real understanding
- Explanations are 1-2 sentences
- Return ONLY JSON, nothing else";

    // ── Build parts array ──────────────────────────────────────────────────
    $parts     = [];
    $textParts = [];

    foreach ($notes as $i => $note) {
        $label = "--- Material " . ($i + 1) . ": {$note['title']} ---";

        if ($note['type'] === 'txt') {
            $textParts[] = $label . "\n" . $note['content'];
        } else {
            // PDF or image — add as inline_data
            $parts[] = [
                'inline_data' => [
                    'mime_type' => $note['mime'],
                    'data'      => $note['content'],
                ],
            ];
        }
    }

    // Add all text content as a single text part
    if (!empty($textParts)) {
        array_unshift($parts, ['text' => implode("\n\n", $textParts)]);
    }

    // Add the quiz generation prompt at the end
    $parts[] = ['text' => $prompt];

    // ── Call Gemini with all parts ─────────────────────────────────────────
    $response = $this->chatWithParts($parts, $system, 4000);
    if (!$response) return null;

    $result = $this->parseJson($response);
    if (!$result) {
        preg_match('/\{.*\}/s', $response, $matches);
        if (!empty($matches[0])) {
            $result = json_decode($matches[0], true);
        }
    }
    return $result;
}

// ── Generate Flashcards from MULTIPLE notes ──────────────────────────────
public function generateFlashcards(
    array  $notes,       
    string $combinedTitle,
    int    $numCards = 10
): ?array {
    $system = "You are an expert flashcard creator for active recall. Generate flashcards covering the provided study materials. Return ONLY valid JSON, no markdown.";

    $prompt = "Generate exactly {$numCards} flashcards covering the provided study materials.
Combined Topic: {$combinedTitle}
Number of source materials: " . count($notes) . "

Focus on key terms, concepts, and important facts. Keep the 'front' short (a question or term) and the 'back' concise but informative.

Return ONLY this JSON:
{
  \"title\": \"Flashcards: {$combinedTitle}\",
  \"cards\": [
    {
      \"front\": \"What is... / Term\",
      \"back\": \"Explanation / Definition\"
    }
  ]
}

Rules:
- Exactly {$numCards} cards.
- Spread questions across ALL materials.
- Explanations should be concise (1-3 sentences).
- Return ONLY JSON, nothing else.";

    $parts     = [];
    $textParts = [];

    foreach ($notes as $i => $note) {
        $label = "--- Material " . ($i + 1) . ": {$note['title']} ---";

        if ($note['type'] === 'txt') {
            $textParts[] = $label . "\n" . $note['content'];
        } else {
            $parts[] = [
                'inline_data' => [
                    'mime_type' => $note['mime'],
                    'data'      => $note['content'],
                ],
            ];
        }
    }

    if (!empty($textParts)) {
        array_unshift($parts, ['text' => implode("\n\n", $textParts)]);
    }

    $parts[] = ['text' => $prompt];

    $response = $this->chatWithParts($parts, $system, 3000);
    if (!$response) return null;

    $result = $this->parseJson($response);
    if (!$result) {
        preg_match('/\{.*\}/s', $response, $matches);
        if (!empty($matches[0])) {
            $result = json_decode($matches[0], true);
        }
    }
    return $result;
}

// ── Summarize MULTIPLE notes with YouTube Recommendations ──────────────────
public function summarizeNotes(
    array  $notes,       
    string $combinedTitle
): ?array {
    $system = "You are an expert study assistant. Provide a comprehensive summary of the study materials, extract key points, identify topics, and recommend relevant YouTube videos for further learning. Return ONLY valid JSON, no markdown.";

    $prompt = "Summarize the following study materials.
Combined Topic: {$combinedTitle}
Number of source materials: " . count($notes) . "

Return ONLY this JSON:
{
  \"summary\": \"A comprehensive paragraph summarizing the core material.\",
  \"key_points\": [\"Important point 1\", \"Important point 2\"],
  \"topics\": [\"Topic A\", \"Topic B\"],
  \"youtube_recommendations\": [
    {
      \"title\": \"Example related video topic or specific title\",
      \"channel\": \"Example channel (e.g., CrashCourse, Khan Academy, or 'Various')\",
      \"search_url\": \"https://www.youtube.com/results?search_query=URL_ENCODED_SEARCH_TERM\",
      \"key_takeaways\": [\"What you will learn 1\", \"What you will learn 2\"]
    }
  ]
}

Rules:
- Provide 3 to 5 YouTube recommendations
- `search_url` must be a valid YouTube search URL based on the topic (e.g., https://www.youtube.com/results?search_query=data+structures)
- Return ONLY JSON, nothing else.";

    $parts     = [];
    $textParts = [];

    foreach ($notes as $i => $note) {
        $label = "--- Material " . ($i + 1) . ": {$note['title']} ---";

        if ($note['type'] === 'txt') {
            $textParts[] = $label . "\n" . $note['content'];
        } else {
            $parts[] = [
                'inline_data' => [
                    'mime_type' => $note['mime'],
                    'data'      => $note['content'],
                ],
            ];
        }
    }

    if (!empty($textParts)) {
        array_unshift($parts, ['text' => implode("\n\n", $textParts)]);
    }

    $parts[] = ['text' => $prompt];

    $response = $this->chatWithParts($parts, $system, 3000);
    if (!$response) return null;

    return $this->parseJson($response);
}

// ── Summarize YouTube Video ───────────────────────────────────────────────
public function summarizeYouTubeVideo(string $url): ?array
{
    // 1. Extract real video metadata from the YouTube page
    $videoInfo = $this->fetchYouTubeVideoInfo($url);
    
    $title       = $videoInfo['title']       ?? 'Unknown Video';
    $description = $videoInfo['description'] ?? '';
    $transcript  = $videoInfo['transcript']  ?? '';

    $system = "You are an expert study assistant. You are given REAL metadata and transcript from a YouTube video. Summarize the ACTUAL content of the video based on this data. Return ONLY valid JSON, no markdown.";

    $contentBlock = "YouTube Video URL: {$url}\nVideo Title: {$title}\n";
    if (!empty($description)) {
        $contentBlock .= "Video Description:\n{$description}\n\n";
    }
    if (!empty($transcript)) {
        $contentBlock .= "Video Transcript / Captions:\n{$transcript}\n\n";
    }

    $prompt = "{$contentBlock}
Based on the ACTUAL video information above, provide a comprehensive summary and extract the detailed important points.

Return ONLY this JSON:
{
  \"title\": \"{$title}\",
  \"summary\": \"A comprehensive, multi-paragraph summary detailing the actual video content, its context, and its core message.\",
  \"key_points\": [
    \"Detailed important point 1 explaining a specific concept or argument made in the video\",
    \"Detailed important point 2...\",
    \"Detailed important point 3...\"
  ],
  \"topics\": [\"Related topic 1\", \"Related topic 2\"]
}

Rules:
- Base your summary strictly on the provided title, description, and transcript
- Do NOT guess or hallucinate content
- Return ONLY JSON, nothing else.";

    $response = $this->chat($system, $prompt, 2000);
    if (!$response) return null;

    return $this->parseJson($response);
}

/**
 * Fetch real YouTube video info: title, description, and transcript
 */
private function fetchYouTubeVideoInfo(string $url): array
{
    $info = ['title' => '', 'description' => '', 'transcript' => ''];

    try {
        // 1. Get title via oEmbed (reliable, no API key needed)
        $oembedUrl = 'https://www.youtube.com/oembed?url=' . urlencode($url) . '&format=json';
        $oembedRes = Http::timeout(10)->get($oembedUrl);
        if ($oembedRes->ok()) {
            $info['title'] = $oembedRes->json('title') ?? '';
        }

        // 2. Fetch the YouTube page HTML for description and captions
        $pageRes = Http::timeout(15)
            ->withHeaders(['Accept-Language' => 'en-US,en;q=0.9'])
            ->get($url);

        if ($pageRes->ok()) {
            $html = $pageRes->body();

            // Extract description from meta tag
            if (preg_match('/<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\']/', $html, $m)) {
                $info['description'] = html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
            }

            // Try to extract captions/transcript URL from the page's ytInitialPlayerResponse
            $transcript = $this->extractYouTubeTranscript($html, $url);
            if (!empty($transcript)) {
                $info['transcript'] = $transcript;
            }
        }
    } catch (\Exception $e) {
        Log::warning('Failed to fetch YouTube video info: ' . $e->getMessage());
    }

    return $info;
}

/**
 * Try to extract and fetch YouTube captions/transcript from page HTML
 */
private function extractYouTubeTranscript(string $html, string $url): string
{
    try {
        // Look for captions track URL in ytInitialPlayerResponse
        if (preg_match('/ytInitialPlayerResponse\s*=\s*(\{.+?\});/', $html, $m)) {
            $playerData = json_decode($m[1], true);

            $captionTracks = $playerData['captions']['playerCaptionsTracklistRenderer']['captionTracks'] ?? [];
            if (empty($captionTracks)) return '';

            // Prefer English, otherwise use the first available track
            $selectedTrack = $captionTracks[0];
            foreach ($captionTracks as $track) {
                if (str_starts_with($track['languageCode'] ?? '', 'en')) {
                    $selectedTrack = $track;
                    break;
                }
            }

            $captionUrl = $selectedTrack['baseUrl'] ?? '';
            if (empty($captionUrl)) return '';

            // Fetch the captions XML
            $captionRes = Http::timeout(10)->get($captionUrl);
            if (!$captionRes->ok()) return '';

            // Parse the XML captions and extract text
            $xml = $captionRes->body();
            preg_match_all('/<text[^>]*>([^<]*)<\/text>/', $xml, $matches);

            if (!empty($matches[1])) {
                $lines = array_map(fn($t) => html_entity_decode(trim($t), ENT_QUOTES, 'UTF-8'), $matches[1]);
                $transcript = implode(' ', array_filter($lines));
                // Limit transcript length to avoid exceeding token limits
                return mb_substr($transcript, 0, 8000);
            }
        }
    } catch (\Exception $e) {
        Log::warning('Failed to extract YouTube transcript: ' . $e->getMessage());
    }

    return '';
}

// ── Core multi-part call ───────────────────────────────────────────────────
private function chatWithParts(array $parts, string $system, int $maxTokens): ?string
{
    $keys = $this->apiKeys;
    shuffle($keys);

    foreach ($keys as $key) {
        foreach ($this->models as $model) {
            try {
                $url = "{$this->baseUrl}/{$model}:generateContent?key={$key}";

            $response = Http::timeout(120)->post($url, [
                'system_instruction' => [
                    'parts' => [['text' => $system]],
                ],
                'contents' => [
                    [
                        'role'  => 'user',
                        'parts' => $parts,
                    ],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $maxTokens,
                    'temperature'     => 0.4,
                ],
            ]);

            Log::info("Gemini parts [{$model}] status: " . $response->status());

            if ($response->failed()) {
                Log::warning("Gemini parts [{$model}] failed: " . $response->body());
                continue;
            }

            $text = $response->json('candidates.0.content.parts.0.text');
            if (!empty($text)) {
                Log::info("Gemini parts success with model: {$model}");
                return $text;
            }

        } catch (\Exception $e) {
            Log::error("Gemini parts [{$model}] exception: " . $e->getMessage());
        }
    }
    }
    return null;
}
}
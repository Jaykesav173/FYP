<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
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
        $this->apiKey = config('services.gemini.key');
    }

    // ── List available models (for debugging) ─────────────────────────────
    public function listModels(): array
    {
        $res = Http::get("{$this->baseUrl}?key={$this->apiKey}");
        return $res->json('models') ?? [];
    }

    // ── Core API Call ──────────────────────────────────────────────────────
    public function chat(string $system, string $user, int $maxTokens = 2000): ?string
    {
        if (empty($this->apiKey)) {
            Log::error('Gemini API key is missing.');
            return null;
        }

        foreach ($this->models as $model) {
            $result = $this->callModel($model, $system, $user, $maxTokens);
            if ($result !== null) {
                Log::info("Gemini success with model: {$model}");
                return $result;
            }
        }

        Log::error('All Gemini models failed.');
        return null;
    }

    private function callModel(string $model, string $system, string $user, int $maxTokens): ?string
    {
        try {
            $url = "{$this->baseUrl}/{$model}:generateContent?key={$this->apiKey}";

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
  \"schedule\": { ... },
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
    foreach ($this->models as $model) {
        try {
            $url = "{$this->baseUrl}/{$model}:generateContent?key={$this->apiKey}";

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

// ── Core multi-part call ───────────────────────────────────────────────────
private function chatWithParts(array $parts, string $system, int $maxTokens): ?string
{
    foreach ($this->models as $model) {
        try {
            $url = "{$this->baseUrl}/{$model}:generateContent?key={$this->apiKey}";

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
    return null;
}
}
<?php

namespace App\Support;

use InvalidArgumentException;

final class QuestionBankManifest
{
    private const OFFICIAL_HOSTS = [
        'developers.google.com',
        'support.google.com',
        'ads.google.com',
        'business.google.com',
        'support.youtube.com',
        'ads.tiktok.com',
        'business.tiktok.com',
        'www.facebook.com',
        'business.facebook.com',
    ];

    /** @param array<string, mixed> $courses @param list<string> $expectedSlugs */
    public static function validate(array $courses, array $expectedSlugs): void
    {
        $actualSlugs = array_keys($courses);
        sort($actualSlugs);
        sort($expectedSlugs);
        if ($actualSlugs !== $expectedSlugs) {
            throw new InvalidArgumentException('The manifest must contain exactly the expected catalog courses.');
        }

        foreach ($courses as $slug => $questions) {
            if (! is_array($questions) || ! array_is_list($questions) || count($questions) < 100) {
                throw new InvalidArgumentException("{$slug} needs at least 100 questions.");
            }

            $keys = [];
            $contents = [];
            $answerSets = [];
            $correctPositions = [0, 0, 0, 0];
            foreach ($questions as $question) {
                if (! is_array($question)) {
                    throw new InvalidArgumentException("{$slug} contains an invalid question.");
                }
                foreach (['key', 'content', 'topic', 'learning_objective', 'difficulty', 'item_form', 'source_url'] as $field) {
                    if (! isset($question[$field]) || ! is_string($question[$field]) || trim($question[$field]) === '') {
                        throw new InvalidArgumentException("{$slug} has a question without {$field}.");
                    }
                }
                if (! in_array($question['difficulty'], ['easy', 'medium', 'hard'], true)) {
                    throw new InvalidArgumentException("{$slug} has an invalid difficulty.");
                }
                $host = strtolower((string) parse_url($question['source_url'], PHP_URL_HOST));
                if (parse_url($question['source_url'], PHP_URL_SCHEME) !== 'https'
                    || ! in_array($host, self::OFFICIAL_HOSTS, true)) {
                    throw new InvalidArgumentException("{$slug} has an unapproved source URL.");
                }
                $key = $question['key'];
                if (strlen($key) > 255 || ! preg_match('/^[a-z0-9][a-z0-9._-]*$/', $key)) {
                    throw new InvalidArgumentException("{$slug} has an invalid bank key.");
                }
                $content = mb_strtolower(preg_replace('/\s+/u', ' ', trim($question['content'])));
                if (isset($keys[$key]) || isset($contents[$content])) {
                    throw new InvalidArgumentException("{$slug} has duplicate question keys or content.");
                }
                $keys[$key] = true;
                $contents[$content] = true;

                $options = $question['options'] ?? null;
                if (! is_array($options) || ! array_is_list($options) || count($options) !== 4) {
                    throw new InvalidArgumentException("{$slug} needs four options per question.");
                }
                $optionContents = [];
                $correctCount = 0;
                foreach ($options as $optionIndex => $option) {
                    if (! is_array($option)
                        || ! isset($option['content'], $option['is_correct'])
                        || ! is_string($option['content'])
                        || trim($option['content']) === ''
                        || ! is_bool($option['is_correct'])) {
                        throw new InvalidArgumentException("{$slug} has an invalid option.");
                    }
                    $optionContents[] = mb_strtolower(trim($option['content']));
                    $correctCount += (int) $option['is_correct'];
                    if ($option['is_correct']) {
                        $correctPositions[$optionIndex]++;
                    }
                }
                if ($correctCount !== 1 || count(array_unique($optionContents)) !== 4) {
                    throw new InvalidArgumentException("{$slug} needs distinct options and one correct answer.");
                }
                sort($optionContents);
                $answerSet = implode("\n", $optionContents);
                if (isset($answerSets[$answerSet])) {
                    throw new InvalidArgumentException("{$slug} repeats an answer task.");
                }
                $answerSets[$answerSet] = true;
            }
            if (min($correctPositions) < (int) ceil(count($questions) * 0.15)
                || max($correctPositions) > (int) floor(count($questions) * 0.35)) {
                throw new InvalidArgumentException("{$slug} has unbalanced correct-answer positions.");
            }
        }
    }
}

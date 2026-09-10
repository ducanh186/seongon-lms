<?php

namespace App\Exceptions;

use RuntimeException;

class ResourceHasDependenciesException extends RuntimeException
{
    /** @param array<string, int> $dependencies */
    public function __construct(public readonly array $dependencies, string $message)
    {
        parent::__construct($message);
    }

    public function render()
    {
        return response()->json([
            'code' => 'resource_has_dependencies',
            'message' => $this->getMessage(),
            'dependencies' => $this->dependencies,
        ], 409);
    }
}

<?php

namespace Tests\Feature;

use Symfony\Component\Process\Process;
use Tests\TestCase;

class VercelEntrypointTest extends TestCase
{
    public function test_vercel_entrypoint_boots_the_laravel_health_route(): void
    {
        $socket = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
        $this->assertNotFalse($socket, $errorMessage);

        $address = stream_socket_get_name($socket, false);
        fclose($socket);
        $this->assertIsString($address);
        $port = (int) substr($address, strrpos($address, ':') + 1);

        $process = new Process(
            [PHP_BINARY, '-S', "127.0.0.1:{$port}", base_path('api/index.php')],
            base_path(),
        );
        $process->start();

        try {
            $response = false;
            $headers = [];
            for ($attempt = 0; $attempt < 30; $attempt++) {
                $response = @file_get_contents("http://127.0.0.1:{$port}/up");
                $headers = $http_response_header ?? [];
                if ($response !== false) {
                    break;
                }
                usleep(100_000);
            }

            $stderr = $process->getErrorOutput();
            $this->assertNotFalse($response, $stderr);
            $this->assertStringContainsString(' 200 ', $headers[0] ?? '', $stderr);
        } finally {
            $process->stop(1);
        }
    }
}

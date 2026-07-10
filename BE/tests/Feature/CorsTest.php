<?php

it('allows the local SPA origin to call the versioned API', function () {
    $response = $this->options('/api/v1/courses', [
        'Origin' => 'http://localhost:5173',
        'Access-Control-Request-Method' => 'GET',
    ]);

    $response->assertSuccessful()
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
});

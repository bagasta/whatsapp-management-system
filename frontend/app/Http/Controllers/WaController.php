<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WaController extends Controller
{
    private function apiBase() {
        return env('BACKEND_BASE_URL', 'http://localhost:3001');
    }
    private function apiKey() {
        return env('BACKEND_API_KEY', 'CHANGE_ME');
    }
    private function headers() {
        return ['X-API-Key' => $this->apiKey()];
    }

    public function dashboard() {
        return view('dashboard');
    }

    public function sessions() {
        $res = Http::withHeaders($this->headers())->get($this->apiBase().'/api/sessions');
        return response()->json($res->json());
    }

    public function createSession(Request $req) {
        $res = Http::withHeaders($this->headers())->post($this->apiBase().'/api/sessions', $req->all());
        return response()->json($res->json());
    }

    public function qr($id) {
        $res = Http::withHeaders($this->headers())->get($this->apiBase().'/api/sessions/'.$id.'/qr');
        return response()->json($res->json());
    }

    public function status($id) {
        $res = Http::withHeaders($this->headers())->get($this->apiBase().'/api/sessions/'.$id.'/status');
        return response()->json($res->json());
    }

    public function sendMessage(Request $req, $id) {
        $res = Http::withHeaders($this->headers())->post($this->apiBase().'/api/sessions/'.$id.'/send-message', $req->all());
        return response()->json($res->json());
    }

    public function sendMedia(Request $req, $id) {
        $res = Http::withHeaders($this->headers())->post($this->apiBase().'/api/sessions/'.$id.'/send-media', $req->all());
        return response()->json($res->json());
    }

    public function chats($id) {
        $res = Http::withHeaders($this->headers())->get($this->apiBase().'/api/sessions/'.$id.'/chats');
        return response()->json($res->json());
    }

    public function contacts($id) {
        $res = Http::withHeaders($this->headers())->get($this->apiBase().'/api/sessions/'.$id.'/contacts');
        return response()->json($res->json());
    }
}

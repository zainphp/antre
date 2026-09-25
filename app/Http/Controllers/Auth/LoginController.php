<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Data\Payload\LoginPayload;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

final class LoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('login');
    }

    public function store(LoginPayload $data, Request $request): RedirectResponse
    {
        if (! Auth::attempt([
            'email' => $data->email,
            'password' => $data->password,
            'role' => UserRole::Administrator->value,
        ], $data->remember)) {
            return back()->withErrors(['email' => 'Email atau kata sandi tidak sesuai.'])->onlyInput('email');
        }

        $request->session()->regenerate();

        return redirect()->intended(route('admin.index'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('home');
    }
}

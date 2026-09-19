import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';
import { router } from '@inertiajs/react';

export function InertiaButton({
    href,
    method = 'get',
    ...props
}: ButtonProps & { href: string; method?: 'get' | 'post' }) {
    return (
        <Button
            {...props}
            onClick={() =>
                method === 'post' ? router.post(href) : router.visit(href)
            }
        />
    );
}

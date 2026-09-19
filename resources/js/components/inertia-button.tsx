import { Button, type ButtonProps } from '@mui/material';
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

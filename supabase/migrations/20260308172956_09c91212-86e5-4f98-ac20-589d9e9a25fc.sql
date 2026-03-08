INSERT INTO public.user_roles (user_id, role)
VALUES ('2b309fc1-adcf-43f4-bbd5-d3dfae3f5a6f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
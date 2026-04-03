import { useState } from 'react';
import {
    Anchor,
    Button,
    Container,
    Paper,
    PasswordInput,
    Text,
    TextInput,
    Title,
    Alert,
} from '@mantine/core';
import { Helmet } from "react-helmet";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IconAlertCircle } from '@tabler/icons-react';

const SignupPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            await signUp(email, password, name);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Signup</title>
            </Helmet>
            <Container size={420} my={40}>
                <Title
                    align="center"
                    sx={() => ({fontWeight: 900})}
                >
                    Create your account
                </Title>
                <Text color="dimmed" size="sm" align="center" mt={5}>
                    Already have an account?{' '}
                    <Anchor size="sm" component={Link} to="/login">
                        Login
                    </Anchor>
                </Text>

                <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <TextInput
                            label="Name"
                            placeholder="Your full name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <TextInput
                            label="Email"
                            placeholder="you@example.com"
                            required
                            mt="md"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="At least 6 characters"
                            required
                            mt="md"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button fullWidth mt="xl" type="submit" loading={loading}>
                            Sign Up
                        </Button>
                    </form>
                </Paper>
            </Container>
        </>
    );
}

export default SignupPage;

import {useEffect, useState} from 'react';
import {
    Alert,
    Anchor,
    Button,
    Checkbox,
    Container,
    Drawer,
    DrawerProps,
    Flex,
    Group,
    Image,
    NumberInput,
    Paper,
    PaperProps,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    useMantineTheme
} from "@mantine/core";
import {IconAlertCircle, IconCurrencyDollar, IconShieldCheckFilled} from "@tabler/icons-react";
import {ICampaign} from "../types";
import {loadStripe} from '@stripe/stripe-js';
import {Elements, PaymentElement, useElements, useStripe} from '@stripe/react-stripe-js';
import {paymentService} from '../services/payment.service';
import {donationsService} from '../services/donations.service';
import {useAuth} from '../contexts/AuthContext';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface IProps extends Pick<DrawerProps, 'opened' | 'onClose' | 'size'> {
    campaign?: ICampaign & {id: string; currency?: string};
    iconSize: number;
    onDonationSuccess?: () => void;
}

interface CheckoutFormProps {
    amount: number;
    donorName: string;
    donorEmail: string;
    anonymous: boolean;
    message: string;
    campaignId: string;
    currency: string;
    clientSecret: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
}

const CheckoutForm = ({amount, donorName, donorEmail, anonymous, message, campaignId, currency, clientSecret, onSuccess, onError}: CheckoutFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        try {
            const {error: submitError} = await elements.submit();
            if (submitError) {
                onError(submitError.message || 'Payment form error');
                setProcessing(false);
                return;
            }

            await donationsService.createDonation({
                campaign_id: campaignId,
                amount,
                currency,
                payment_intent_id: clientSecret.split('_secret_')[0],
                donor_name: donorName,
                donor_email: donorEmail,
                anonymous,
                message: message || undefined,
            });

            const {error: confirmError} = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    return_url: window.location.href,
                    receipt_email: donorEmail,
                },
                redirect: 'if_required',
            });

            if (confirmError) {
                onError(confirmError.message || 'Payment failed');
            } else {
                onSuccess();
            }
        } catch (err: any) {
            onError(err.message || 'An error occurred');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement/>
            <Button fullWidth mt="md" size="lg" type="submit" loading={processing} disabled={!stripe || !elements}>
                Donate ${amount.toFixed(2)} Now
            </Button>
        </form>
    );
};

const DonationDrawer = ({campaign, iconSize, onDonationSuccess, ...others}: IProps) => {
    const theme = useMantineTheme();
    const {profile} = useAuth();
    const [amount, setAmount] = useState<number>(25);
    const [donorName, setDonorName] = useState('');
    const [donorEmail, setDonorEmail] = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [message, setMessage] = useState('');
    const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loadingIntent, setLoadingIntent] = useState(false);

    useEffect(() => {
        if (profile) {
            setDonorName(profile.name || '');
            setDonorEmail(profile.email || '');
        }
    }, [profile]);

    useEffect(() => {
        if (!others.opened) {
            setStep('details');
            setClientSecret(null);
            setError('');
        }
    }, [others.opened]);

    const paperProps: PaperProps = {
        p: "md",
        withBorder: true,
        sx: {backgroundColor: theme.white}
    };

    const handleProceedToPayment = async () => {
        if (!campaign) return;
        if (!donorName.trim() || !donorEmail.trim()) {
            setError('Please fill in your name and email.');
            return;
        }
        if (!amount || amount < 1) {
            setError('Please enter a valid donation amount (minimum $1).');
            return;
        }
        setError('');
        setLoadingIntent(true);
        try {
            const {clientSecret: cs} = await paymentService.createPaymentIntent({
                amount,
                currency: campaign.currency || 'usd',
                campaignId: campaign.id,
                donorEmail,
                donorName,
            });
            setClientSecret(cs);
            setStep('payment');
        } catch (err: any) {
            setError(err.message || 'Failed to initialize payment. Please try again.');
        } finally {
            setLoadingIntent(false);
        }
    };

    const handleSuccess = () => {
        setStep('success');
        if (onDonationSuccess) onDonationSuccess();
    };

    return (
        <Drawer
            position="bottom"
            title="Make a Donation"
            size="100%"
            scrollAreaComponent={ScrollArea.Autosize}
            {...others}
        >
            <Container size="sm">
                <Stack>
                    {campaign && (
                        <Flex gap="xs" align="center">
                            <Image src={campaign?.mainImage} height={96} width={120} fit="contain" radius="sm"/>
                            <Text>You&apos;re supporting <b>{campaign?.title}</b></Text>
                        </Flex>
                    )}

                    {step === 'success' && (
                        <Paper {...paperProps}>
                            <Stack align="center" py="xl">
                                <ThemeIcon size={60} radius="xl" color="green">
                                    <IconShieldCheckFilled size={32}/>
                                </ThemeIcon>
                                <Text size="xl" fw={700}>Thank you for your donation!</Text>
                                <Text color="dimmed" align="center">
                                    Your payment of <b>${amount.toFixed(2)}</b> to <b>{campaign?.title}</b> was successful.
                                    A receipt has been sent to {donorEmail}.
                                </Text>
                                <Button onClick={others.onClose}>Close</Button>
                            </Stack>
                        </Paper>
                    )}

                    {step === 'details' && (
                        <>
                            {error && (
                                <Alert icon={<IconAlertCircle size={16}/>} color="red">
                                    {error}
                                </Alert>
                            )}
                            <NumberInput
                                size="md"
                                label="Enter your donation amount (USD)"
                                description="Minimum donation is $1"
                                precision={2}
                                min={1}
                                value={amount}
                                onChange={(val) => setAmount(Number(val) || 0)}
                                rightSection={<IconCurrencyDollar size={iconSize}/>}
                            />
                            <Paper {...paperProps}>
                                <Stack>
                                    <TextInput
                                        label="Your Name"
                                        placeholder="Full name"
                                        required
                                        value={donorName}
                                        onChange={(e) => setDonorName(e.target.value)}
                                    />
                                    <TextInput
                                        label="Email Address"
                                        placeholder="your@email.com"
                                        required
                                        type="email"
                                        value={donorEmail}
                                        onChange={(e) => setDonorEmail(e.target.value)}
                                    />
                                    <TextInput
                                        label="Leave a message (optional)"
                                        placeholder="A message for the campaign creator..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                    <Checkbox
                                        label="Make my donation anonymous"
                                        checked={anonymous}
                                        onChange={(e) => setAnonymous(e.target.checked)}
                                    />
                                </Stack>
                            </Paper>
                            <Paper {...paperProps}>
                                <Stack>
                                    <Text fw={700} size="lg">Your donation</Text>
                                    <Group position="apart">
                                        <Text>Donation amount</Text>
                                        <Text fw={500}>${(amount || 0).toFixed(2)}</Text>
                                    </Group>
                                    <Group position="apart">
                                        <Text fw={700}>Total due today</Text>
                                        <Text fw={700}>${(amount || 0).toFixed(2)}</Text>
                                    </Group>
                                    <Button size="lg" loading={loadingIntent} onClick={handleProceedToPayment}>
                                        Continue to Payment
                                    </Button>
                                </Stack>
                            </Paper>
                            <Paper {...paperProps}>
                                <Stack>
                                    <Text size="sm">By continuing, you agree with <Anchor>CrowdUp terms</Anchor> and <Anchor>privacy notice.</Anchor></Text>
                                    <Flex gap="sm">
                                        <ThemeIcon size="lg" variant="light" color="blue">
                                            <IconShieldCheckFilled size={18}/>
                                        </ThemeIcon>
                                        <Text size="sm">Payments are secured by Stripe. We guarantee a full refund in the rare case of fraud.</Text>
                                    </Flex>
                                </Stack>
                            </Paper>
                        </>
                    )}

                    {step === 'payment' && clientSecret && stripePromise && (
                        <>
                            {error && (
                                <Alert icon={<IconAlertCircle size={16}/>} color="red" mb="sm">
                                    {error}
                                </Alert>
                            )}
                            <Paper {...paperProps}>
                                <Group position="apart" mb="md">
                                    <Text fw={700} size="lg">Enter Payment Details</Text>
                                    <Text size="sm" color="dimmed">Total: ${amount.toFixed(2)}</Text>
                                </Group>
                                <Text size="xs" color="dimmed" mb="md">
                                    Test card: 4242 4242 4242 4242 | Any future date | Any CVV
                                </Text>
                                <Elements stripe={stripePromise} options={{clientSecret, appearance: {theme: 'stripe'}}}>
                                    <CheckoutForm
                                        amount={amount}
                                        donorName={donorName}
                                        donorEmail={donorEmail}
                                        anonymous={anonymous}
                                        message={message}
                                        campaignId={campaign?.id || ''}
                                        currency={campaign?.currency || 'usd'}
                                        clientSecret={clientSecret}
                                        onSuccess={handleSuccess}
                                        onError={setError}
                                    />
                                </Elements>
                            </Paper>
                            <Button variant="subtle" onClick={() => setStep('details')}>
                                ← Back to details
                            </Button>
                        </>
                    )}
                </Stack>
            </Container>
        </Drawer>
    );
};

export default DonationDrawer;

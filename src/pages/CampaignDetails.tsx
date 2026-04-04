import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {
    Accordion,
    ActionIcon,
    Anchor,
    Avatar,
    Box,
    Button,
    Card,
    Center,
    Container,
    Divider,
    Flex,
    Grid,
    Group,
    Image,
    Loader,
    Paper,
    PaperProps,
    Progress,
    Stack,
    Text,
    TextProps,
    Title,
    TitleProps,
    UnstyledButton
} from "@mantine/core";
import {IconFlag, IconHeart, IconHeartFilled, IconSeparator, IconShare} from "@tabler/icons-react";
import {useDisclosure, useMediaQuery, useToggle} from "@mantine/hooks";
import {BackButton, DonationDrawer, NotFound, ShareModal, UserCard} from "../components";
import {Helmet} from "react-helmet";
import * as dayjs from "dayjs";
import * as LocalizedFormat from "dayjs/plugin/localizedFormat"
import {notifications} from "@mantine/notifications";
import {campaignsService, Campaign} from "../services/campaigns.service";
import {donationsService} from "../services/donations.service";
import {ICampaign} from "../types";

const CampaignDetailsPage = (): JSX.Element => {
    dayjs.extend(LocalizedFormat);
    const {id} = useParams();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [donorCount, setDonorCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [opened, {open, close}] = useDisclosure(false);
    const [donateOpened, {open: donateOpen, close: donateClose}] = useDisclosure(false);
    const [following, setFollowing] = useToggle();
    const matchesMobile = useMediaQuery('(max-width: 768px)');

    const paperProps: PaperProps = {
        p: "md",
        shadow: "sm",
    };

    const titleProps: TitleProps = {
        size: 32,
        weight: 700,
        transform: 'capitalize',
        sx: {lineHeight: '40px'}
    };

    const subTitleProps: TextProps = {
        size: 20,
        weight: 600,
        sx: {lineHeight: '28px'}
    };

    const iconSize = 18;

    const fetchCampaign = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await campaignsService.getCampaignById(id);
            setCampaign(data);
            const stats = await donationsService.getDonationStats(id);
            setDonorCount(stats.totalDonations);
        } catch (err) {
            console.error('Error fetching campaign:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaign();
    }, [id]);

    const progressPercent = campaign
        ? Math.min(100, (campaign.amount_raised / campaign.goal_amount) * 100)
        : 0;

    const daysLeft = campaign?.deadline
        ? Math.max(0, dayjs(campaign.deadline).diff(dayjs(), 'day'))
        : null;

    const legacyCampaign: ICampaign | undefined = campaign ? {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        createdAt: campaign.created_at,
        mainImage: campaign.main_image || '',
        createdBy: campaign.creator?.name || 'Anonymous',
        daysLeft: daysLeft ?? 0,
        amountRaised: `$${campaign.amount_raised.toLocaleString()}`,
        goal: `$${campaign.goal_amount.toLocaleString()}`,
        contributors: donorCount,
        createdByImage: campaign.creator?.avatar_url || '',
        category: campaign.category,
        country: campaign.country,
        type: null,
        currency: campaign.currency,
    } as any : undefined;

    if (loading) {
        return (
            <Center style={{minHeight: '60vh'}}>
                <Loader size="xl"/>
            </Center>
        );
    }

    if (!campaign) {
        return (
            <Center style={{minHeight: '60vh'}}>
                <Stack align="center" spacing="sm">
                    <Text size="xl" weight={600}>Campaign not found</Text>
                    <Text color="dimmed">This campaign may not exist or you may not have permission to view it.</Text>
                    <Button component="a" href="/campaigns" variant="light">Browse Campaigns</Button>
                </Stack>
            </Center>
        );
    }

    return (
        <>
            <Helmet>
                <title>{campaign?.title || 'Campaign'}</title>
            </Helmet>
            <Box>
                {campaign ? <Container size="lg">
                    <BackButton mb="md"/>
                    <Grid>
                        <Grid.Col lg={8}>
                            <Stack>
                                <Card padding="md" shadow="sm">
                                    <Card.Section>
                                        <Image src={campaign?.main_image || ''} height={480}/>
                                    </Card.Section>
                                    <Stack mt="md">
                                        <Title>{campaign?.title}</Title>
                                        {!matchesMobile ?
                                            <Flex gap="xs" align="center">
                                                <Text size="sm">Fundraise campaign created by</Text>
                                                <UnstyledButton component={Anchor}>
                                                    <Flex gap="xs" align="center">
                                                        <Avatar src={campaign?.creator?.avatar_url || ''} radius="xl" size="sm"/>
                                                        <Text size="sm">{campaign?.creator?.name || 'Anonymous'}</Text>
                                                    </Flex>
                                                </UnstyledButton>
                                                <IconSeparator size={18}/>
                                                <Text component={Anchor} size="sm">{campaign?.country}</Text>
                                                <IconSeparator size={18}/>
                                                <Text component={Anchor} size="sm">{campaign?.category}</Text>
                                            </Flex> :
                                            <Stack>
                                                <Flex gap="md">
                                                    <Text size="sm">Fundraise campaign created by</Text>
                                                    <UnstyledButton component={Anchor}>
                                                        <Flex gap="xs" align="center">
                                                            <Avatar src={campaign?.creator?.avatar_url || ''} radius="xl" size="sm"/>
                                                            <Text size="sm">{campaign?.creator?.name || 'Anonymous'}</Text>
                                                        </Flex>
                                                    </UnstyledButton>
                                                </Flex>
                                                <Group>
                                                    <Text size="sm">Location - <Anchor>{campaign?.country}</Anchor></Text>
                                                    <Text size="sm">Category - <Anchor>{campaign?.category}</Anchor></Text>
                                                </Group>
                                            </Stack>
                                        }
                                        <Text {...subTitleProps}>Our story</Text>
                                        <div dangerouslySetInnerHTML={{__html: campaign?.description || ''}}/>
                                        {matchesMobile && <>
                                            <Divider/>
                                            <Flex align="flex-end" gap="sm">
                                                <Title {...titleProps} align="center">${campaign?.amount_raised.toLocaleString()}</Title>
                                                <Text fw={500} align="center" color="dimmed">raised of ${campaign?.goal_amount.toLocaleString()}</Text>
                                            </Flex>
                                            <Progress value={progressPercent} size="md"/>
                                            <Flex justify="space-between">
                                                <Text fw={500}>{progressPercent.toFixed(0)}% Funded</Text>
                                                <Text fw={500}>{donorCount} Donors</Text>
                                            </Flex>
                                            {daysLeft !== null && <Text size="sm" color="dimmed">{daysLeft} days left</Text>}
                                            <Flex align="center" gap="xs">
                                                <Button onClick={donateOpen} fullWidth>Donate</Button>
                                                <ActionIcon variant="subtle" onClick={open} color="blue" title="Share" size="lg">
                                                    <IconShare size={iconSize}/>
                                                </ActionIcon>
                                                <ActionIcon
                                                    title={`${following ? 'Unfollow' : 'Follow'} this campaign`}
                                                    size="lg"
                                                    color="secondary"
                                                    onClick={() => {
                                                        setFollowing();
                                                        notifications.show({
                                                            title: 'Notification',
                                                            message: `${following ? 'Unfollowed' : 'Following'} this campaign`,
                                                            withBorder: true,
                                                        });
                                                    }}
                                                >
                                                    {following ? <IconHeartFilled size={iconSize}/> : <IconHeart size={iconSize}/>}
                                                </ActionIcon>
                                            </Flex>
                                        </>}
                                    </Stack>
                                </Card>
                                <Paper {...paperProps}>
                                    <Text {...subTitleProps} mb="sm">Organizer</Text>
                                    <UserCard/>
                                </Paper>
                                <Paper {...paperProps}>
                                    <Text>Created on {dayjs(campaign?.created_at).format('LL')}</Text>
                                </Paper>
                                {!matchesMobile &&
                                    <Button leftIcon={<IconFlag size={iconSize}/>} variant="subtle" color="secondary">
                                        Report campaign
                                    </Button>
                                }
                            </Stack>
                        </Grid.Col>
                        <Grid.Col lg={4}>
                            <Stack>
                                {!matchesMobile &&
                                    <Paper {...paperProps}>
                                        <Stack spacing="sm">
                                            <Title {...titleProps} align="center">${campaign?.amount_raised.toLocaleString()}</Title>
                                            <Text fw={500} align="center" color="dimmed">raised of ${campaign?.goal_amount.toLocaleString()}</Text>
                                            <Progress value={progressPercent} size="md"/>
                                            <Flex justify="space-between">
                                                <Text fw={500}>{progressPercent.toFixed(0)}% Funded</Text>
                                                <Text fw={500}>{donorCount} Donors</Text>
                                            </Flex>
                                            {daysLeft !== null && <Text size="sm" color="dimmed" align="center">{daysLeft} days left</Text>}
                                            <Button size="xl" onClick={donateOpen}>Donate Now</Button>
                                            <Button leftIcon={<IconShare size={iconSize}/>} variant="outline" onClick={open} color="blue">
                                                Share with friends
                                            </Button>
                                            <Button
                                                leftIcon={following ? <IconHeartFilled size={iconSize}/> : <IconHeart size={iconSize}/>}
                                                variant={following ? 'filled' : 'subtle'}
                                                color="secondary"
                                                onClick={() => {
                                                    setFollowing();
                                                    notifications.show({
                                                        title: 'Notification',
                                                        message: `${following ? 'Unfollowed' : 'Following'} this campaign`,
                                                        withBorder: true,
                                                    });
                                                }}
                                            >
                                                {following ? 'Unfollow' : 'Follow'} this campaign
                                            </Button>
                                        </Stack>
                                    </Paper>
                                }
                                <Paper {...paperProps}>
                                    <Text {...subTitleProps} mb="md">Donation FAQ</Text>
                                    <Accordion defaultValue="when" variant="separated">
                                        <Accordion.Item value="when">
                                            <Accordion.Control>When will {campaign?.creator?.name || 'the organizer'} get my payment?</Accordion.Control>
                                            <Accordion.Panel>Your payment is sent directly to the campaign organizer so it immediately helps their campaign.</Accordion.Panel>
                                        </Accordion.Item>
                                        <Accordion.Item value="security">
                                            <Accordion.Control>How secure is the payment process?</Accordion.Control>
                                            <Accordion.Panel>Payments are made in a highly-secure environment. We use Stripe, the industry leading payment processor, to keep your information safe and encrypted.</Accordion.Panel>
                                        </Accordion.Item>
                                    </Accordion>
                                </Paper>
                                {matchesMobile &&
                                    <Button leftIcon={<IconFlag size={iconSize}/>} variant="subtle" color="secondary">
                                        Report campaign
                                    </Button>
                                }
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Container> : <NotFound/>}
                <ShareModal opened={opened} onClose={close} campaign={legacyCampaign} iconSize={iconSize}/>
                <DonationDrawer
                    campaign={legacyCampaign as any}
                    opened={donateOpened}
                    onClose={donateClose}
                    iconSize={iconSize}
                    onDonationSuccess={fetchCampaign}
                />
            </Box>
        </>
    );
};

export default CampaignDetailsPage;

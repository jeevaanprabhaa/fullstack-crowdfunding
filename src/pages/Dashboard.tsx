import {useEffect, useState} from "react";
import {
    Box,
    Button,
    Card,
    Center,
    Container,
    createStyles,
    Flex,
    Group,
    Loader,
    Paper,
    PaperProps,
    rem,
    SimpleGrid,
    Stack,
    Text,
    Title,
    TitleProps
} from "@mantine/core";
import {
    IconArrowUpRight,
    IconPlus,
    IconReceipt2,
    IconTrophy
} from "@tabler/icons-react";
import {CampaignsTable, DonatorsTable, YearlyDonationChart} from "../components";
import {Helmet} from "react-helmet";
import {Link} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";
import {campaignsService, Campaign} from "../services/campaigns.service";
import {donationsService, Donation} from "../services/donations.service";

const useStyles = createStyles((theme) => ({
    root: {
        padding: `calc(${theme.spacing.xl} * 1.5)`,
    },
    value: {
        fontSize: rem(24),
        fontWeight: 700,
        lineHeight: 1,
    },
    diff: {
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
    },
    icon: {
        color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[5],
    },
    title: {
        fontWeight: 700,
        textTransform: 'uppercase',
    },
}));

const DashboardPage = () => {
    const {classes} = useStyles();
    const {user, profile} = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);

    const paperProps: PaperProps = {
        p: "md",
        shadow: "sm"
    };

    const subTitleProps: TitleProps = {
        size: 18,
        mb: "sm"
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [campData, donData] = await Promise.all([
                    campaignsService.getCampaignsByCreator(user.id),
                    donationsService.getDonationsByUser(user.id),
                ]);
                setCampaigns(campData);
                setDonations(donData);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const totalDonationsReceived = campaigns.reduce((sum, c) => sum + c.amount_raised, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalDonated = donations.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <>
            <Helmet>
                <title>Dashboard</title>
            </Helmet>
            <Box>
                <Container fluid my="xl">
                    <Stack spacing="xl">
                        <Title order={3}>{getGreeting()}, {profile?.name || 'there'}</Title>
                        {loading ? (
                            <Center py="xl">
                                <Loader size="lg"/>
                            </Center>
                        ) : (
                            <>
                                <SimpleGrid
                                    cols={4}
                                    breakpoints={[
                                        {maxWidth: 'md', cols: 2, spacing: 'md'},
                                        {maxWidth: 'sm', cols: 1, spacing: 'sm'}
                                    ]}
                                >
                                    <Paper {...paperProps}>
                                        <Group position="apart">
                                            <Text size="xs" color="dimmed" className={classes.title}>Total Raised</Text>
                                            <IconReceipt2 className={classes.icon} size="1.4rem" stroke={1.5}/>
                                        </Group>
                                        <Group align="flex-end" spacing="xs" mt={25}>
                                            <Text className={classes.value}>${totalDonationsReceived.toLocaleString()}</Text>
                                            <Text color="teal" fz="sm" fw={500} className={classes.diff}>
                                                <IconArrowUpRight size="1rem" stroke={1.5}/>
                                            </Text>
                                        </Group>
                                        <Text fz="xs" c="dimmed" mt={7}>Across all your campaigns</Text>
                                    </Paper>
                                    <Paper {...paperProps}>
                                        <Group position="apart">
                                            <Text size="xs" color="dimmed" className={classes.title}>My Donations</Text>
                                            <IconReceipt2 className={classes.icon} size="1.4rem" stroke={1.5}/>
                                        </Group>
                                        <Group align="flex-end" spacing="xs" mt={25}>
                                            <Text className={classes.value}>${totalDonated.toLocaleString()}</Text>
                                        </Group>
                                        <Text fz="xs" c="dimmed" mt={7}>Total you've donated</Text>
                                    </Paper>
                                    <Paper {...paperProps}>
                                        <Group position="apart">
                                            <Text size="xs" color="dimmed" className={classes.title}>My Campaigns</Text>
                                            <IconTrophy className={classes.icon} size="1.4rem" stroke={1.5}/>
                                        </Group>
                                        <Group align="flex-end" spacing="xs" mt={25}>
                                            <Text className={classes.value}>{campaigns.length}</Text>
                                        </Group>
                                        <Text fz="xs" c="dimmed" mt={7}>Total campaigns created</Text>
                                    </Paper>
                                    <Paper {...paperProps}>
                                        <Group position="apart">
                                            <Text size="xs" color="dimmed" className={classes.title}>Active Campaigns</Text>
                                            <IconTrophy className={classes.icon} size="1.4rem" stroke={1.5}/>
                                        </Group>
                                        <Group align="flex-end" spacing="xs" mt={25}>
                                            <Text className={classes.value}>{activeCampaigns}</Text>
                                        </Group>
                                        <Text fz="xs" c="dimmed" mt={7}>Currently running</Text>
                                    </Paper>
                                </SimpleGrid>
                                <Paper {...paperProps}>
                                    <Card.Section mb="lg">
                                        <Flex align="center" justify="space-between">
                                            <Box>
                                                <Title {...subTitleProps}>My Campaigns</Title>
                                                <Text size="sm">Manage your fundraising campaigns</Text>
                                            </Box>
                                            <Button leftIcon={<IconPlus size={18}/>} component={Link} to="/create-campaign">
                                                Create a Campaign
                                            </Button>
                                        </Flex>
                                    </Card.Section>
                                    <Card.Section>
                                        <CampaignsTable campaigns={campaigns}/>
                                    </Card.Section>
                                </Paper>
                                <Paper {...paperProps}>
                                    <Card.Section>
                                        <Title {...subTitleProps}>My Donations</Title>
                                        <DonatorsTable donations={donations}/>
                                    </Card.Section>
                                </Paper>
                                <Paper {...paperProps}>
                                    <Title {...subTitleProps}>Donations per Category</Title>
                                    <YearlyDonationChart campaigns={campaigns}/>
                                </Paper>
                            </>
                        )}
                    </Stack>
                </Container>
            </Box>
        </>
    );
};

export default DashboardPage;

import {useEffect, useState} from "react";
import {Box, BoxProps, Center, Container, Flex, Loader, Select, SimpleGrid, Stack, Text, TextInput, Title, TitleProps} from "@mantine/core";
import {CampaignCard} from "../components";
import {Helmet} from "react-helmet";
import {useMediaQuery} from "@mantine/hooks";
import {campaignsService, Campaign} from "../services/campaigns.service";
import {ICampaign} from "../types";
import {useDebouncedValue} from "@mantine/hooks";

const toICampaign = (c: Campaign): ICampaign => ({
    id: c.id,
    title: c.title,
    description: c.description,
    createdAt: c.created_at,
    mainImage: c.main_image || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=500&q=60',
    createdBy: c.creator?.name || 'Anonymous',
    daysLeft: c.deadline ? Math.max(0, Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
    amountRaised: `$${c.amount_raised.toLocaleString()}`,
    goal: `$${c.goal_amount.toLocaleString()}`,
    contributors: 0,
    createdByImage: c.creator?.avatar_url || '',
    category: c.category,
    country: c.country,
    type: null,
});

const CampaignsPage = (): JSX.Element => {
    const matchesMobile = useMediaQuery('(max-width: 768px)');
    const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const [sortBy, setSortBy] = useState('featured');

    const boxProps: BoxProps = {
        mt: matchesMobile ? 4 : 24,
        mb: matchesMobile ? 4 : 48,
        py: matchesMobile ? 16 : 24
    };

    const titleProps: TitleProps = {
        size: 32,
        weight: 700,
        mb: "lg",
        transform: 'capitalize',
        sx: {lineHeight: '40px'}
    };

    useEffect(() => {
        const fetchCampaigns = async () => {
            setLoading(true);
            try {
                let data: Campaign[];
                if (debouncedSearch.trim()) {
                    data = await campaignsService.searchCampaigns(debouncedSearch);
                } else {
                    data = await campaignsService.getAllCampaigns();
                }
                setCampaigns(data.map(toICampaign));
            } catch (err) {
                console.error('Error fetching campaigns:', err);
                setCampaigns([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, [debouncedSearch]);

    const sortedCampaigns = [...campaigns].sort((a, b) => {
        if (sortBy === 'popular') {
            return b.contributors - a.contributors;
        }
        if (sortBy === 'latest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
    });

    return (
        <>
            <Helmet>
                <title>Discover campaigns to fund</title>
            </Helmet>
            <Box>
                <Container size="lg">
                    <Stack>
                        <Box {...boxProps}>
                            <Title {...titleProps} align="center">Discover campaigns to fund</Title>
                        </Box>
                        <Flex
                            justify="space-between"
                            gap={{base: 'sm', sm: 'lg'}}
                            direction={{base: 'column-reverse', sm: 'row'}}
                        >
                            <TextInput
                                placeholder="search campaigns..."
                                sx={{width: 500}}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <Flex align="center" gap="sm" justify={{base: 'space-between', sm: 'flex-start'}}>
                                <Select
                                    label=""
                                    placeholder="sort by"
                                    value={sortBy}
                                    onChange={(v) => setSortBy(v || 'featured')}
                                    data={[
                                        {value: 'featured', label: 'sort by: featured'},
                                        {value: 'popular', label: 'sort by: popular'},
                                        {value: 'latest', label: 'sort by: latest'},
                                    ]}
                                />
                            </Flex>
                        </Flex>
                        {loading ? (
                            <Center py="xl">
                                <Loader size="lg"/>
                            </Center>
                        ) : sortedCampaigns.length === 0 ? (
                            <Center py="xl">
                                <Text color="dimmed">No campaigns found. Be the first to create one!</Text>
                            </Center>
                        ) : (
                            <SimpleGrid
                                cols={3}
                                spacing="lg"
                                breakpoints={[
                                    {maxWidth: 'md', cols: 2, spacing: 'md'},
                                    {maxWidth: 'sm', cols: 1, spacing: 0},
                                ]}
                            >
                                {sortedCampaigns.map(c => <CampaignCard key={c.id} data={c} showActions={true}/>)}
                            </SimpleGrid>
                        )}
                    </Stack>
                </Container>
            </Box>
        </>
    );
};

export default CampaignsPage;

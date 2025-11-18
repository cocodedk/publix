import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
    Container,
    Paper,
    Typography,
    Box,
    AppBar,
    Toolbar,
    Link,
    CircularProgress,
    Button
} from "@mui/material";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

interface GraphNode {
    id: string;
    label: string;
    group: string;
}

interface GraphEdge {
    from: string;
    to: string;
}

export default function GraphPage() {
    const [loading, setLoading] = useState(true);
    const networkRef = useRef<HTMLDivElement>(null);
    const networkInstanceRef = useRef<Network | null>(null);

    useEffect(() => {
        fetchGraphData();
        return () => {
            if (networkInstanceRef.current) {
                networkInstanceRef.current.destroy();
            }
        };
    }, []);

    const fetchGraphData = async () => {
        try {
            // Fetch sample data for visualization
            const { data } = await axios.get("/api/content/list?perPage=100");

            const nodes = new DataSet<any>([]);
            const edges = new DataSet<any>([]);
            const tldMap = new Map<string, string>();
            const domainMap = new Map<string, string>();

            data.items.forEach((item: any) => {
                if (item.tld && !tldMap.has(item.tld)) {
                    const tldId = `tld-${item.tld}`;
                    nodes.add({
                        id: tldId,
                        label: item.tld,
                        group: "tld",
                        color: { background: "#4CAF50", border: "#2E7D32" },
                        font: { size: 16, color: "#fff" }
                    });
                    tldMap.set(item.tld, tldId);
                }

                if (item.domain && !domainMap.has(item.domain)) {
                    const domainId = `domain-${item.domain}`;
                    nodes.add({
                        id: domainId,
                        label: item.domain,
                        group: "domain",
                        color: { background: "#2196F3", border: "#1565C0" },
                        font: { size: 14 }
                    });
                    domainMap.set(item.domain, domainId);

                    if (item.tld) {
                        edges.add({
                            from: tldMap.get(item.tld)!,
                            to: domainId,
                            arrows: "to"
                        });
                    }
                }

                const contentId = `content-${item.id}`;
                nodes.add({
                    id: contentId,
                    label: item.email.split("@")[0].substring(0, 20),
                    group: "content",
                    color: { background: "#FF9800", border: "#E65100" },
                    font: { size: 12 },
                    title: item.email
                });

                if (item.domain) {
                    edges.add({
                        from: domainMap.get(item.domain)!,
                        to: contentId,
                        arrows: "to"
                    });
                }
            });

            // Initialize network
            if (networkRef.current) {
                const data = { nodes, edges };
                const options = {
                    nodes: {
                        shape: "box",
                        borderWidth: 2,
                        shadow: true
                    },
                    edges: {
                        width: 2,
                        shadow: true,
                        smooth: {
                            type: "continuous"
                        }
                    },
                    physics: {
                        enabled: true,
                        stabilization: { iterations: 200 }
                    },
                    interaction: {
                        hover: true,
                        tooltipDelay: 200
                    }
                };

                networkInstanceRef.current = new Network(networkRef.current, data, options);
            }
        } catch (error) {
            console.error("Failed to fetch graph data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - Graph Visualization
                    </Typography>
                    <Link href="/" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Search
                    </Link>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Data Relationship Graph
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Visual representation of TLD → Domain → ContentLine relationships
                    </Typography>

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box
                            ref={networkRef}
                            sx={{
                                height: 600,
                                border: "1px solid #ccc",
                                borderRadius: 1,
                                backgroundColor: "#f5f5f5"
                            }}
                        />
                    )}

                    <Box sx={{ mt: 3 }}>
                        <Button variant="outlined" onClick={fetchGraphData}>
                            Refresh Graph
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </>
    );
}

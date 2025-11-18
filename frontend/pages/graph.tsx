import { useState, useEffect } from "react";
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
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);

    useEffect(() => {
        fetchGraphData();
    }, []);

    const fetchGraphData = async () => {
        try {
            // Fetch sample data for visualization
            const { data } = await axios.get("/api/content/list?perPage=50");

            const graphNodes: GraphNode[] = [];
            const graphEdges: GraphEdge[] = [];
            const tldMap = new Map<string, string>();
            const domainMap = new Map<string, string>();

            data.items.forEach((item: any) => {
                if (item.tld && !tldMap.has(item.tld)) {
                    const tldId = `tld-${item.tld}`;
                    graphNodes.push({ id: tldId, label: item.tld, group: "tld" });
                    tldMap.set(item.tld, tldId);
                }

                if (item.domain && !domainMap.has(item.domain)) {
                    const domainId = `domain-${item.domain}`;
                    graphNodes.push({ id: domainId, label: item.domain, group: "domain" });
                    domainMap.set(item.domain, domainId);

                    if (item.tld) {
                        graphEdges.push({
                            from: tldMap.get(item.tld)!,
                            to: domainId
                        });
                    }
                }

                const contentId = `content-${item.id}`;
                graphNodes.push({ id: contentId, label: item.email.split("@")[0], group: "content" });

                if (item.domain) {
                    graphEdges.push({
                        from: domainMap.get(item.domain)!,
                        to: contentId
                    });
                }
            });

            setNodes(graphNodes);
            setEdges(graphEdges);
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
                        <Box sx={{ height: 600, border: "1px solid #ccc", borderRadius: 1, p: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Graph visualization will be rendered here.
                                Install vis-network or cytoscape for interactive graph.
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2">Nodes: {nodes.length}</Typography>
                                <Typography variant="subtitle2">Edges: {edges.length}</Typography>
                            </Box>
                        </Box>
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

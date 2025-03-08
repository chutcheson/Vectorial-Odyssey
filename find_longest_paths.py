import json
import networkx as nx
from hop_distance_calculator import load_similarity_data, build_graph

def find_longest_paths(G, limit=10):
    """Find the longest shortest paths in the graph."""
    # Calculate shortest paths between all pairs of nodes
    paths = dict(nx.all_pairs_shortest_path(G))
    
    # Find the longest paths
    longest_paths = []
    
    for source in paths:
        for target, path in paths[source].items():
            if source != target:
                path_length = len(path) - 1  # Subtract 1 to get the number of hops
                longest_paths.append((source, target, path_length, path))
    
    # Sort by path length (descending)
    longest_paths.sort(key=lambda x: x[2], reverse=True)
    
    return longest_paths[:limit]

def main():
    # Load similarity data
    similarity_data = load_similarity_data()
    
    # Build graph
    G = build_graph(similarity_data)
    
    # Find longest paths
    longest_paths = find_longest_paths(G, limit=20)
    
    print("\nLongest Shortest Paths in the Word Graph:")
    print("=========================================")
    
    for source, target, length, path in longest_paths:
        print(f"{source} → {target}: {length} hops")
        print(f"Path: {' → '.join(path)}")
        print()

if __name__ == "__main__":
    main()
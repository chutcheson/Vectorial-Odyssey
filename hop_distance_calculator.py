import json
import networkx as nx
import tqdm
from collections import defaultdict

def load_similarity_data(file_path="word_similarities.json"):
    """Load the word similarity data from JSON."""
    print(f"Loading similarity data from {file_path}...")
    with open(file_path, 'r') as f:
        return json.load(f)

def build_graph(similarity_data):
    """
    Build a graph where nodes are words and edges connect each word to:
    1. Its two most similar words (synonyms)
    2. Its two least similar words (antonyms)
    """
    print("Building graph with synonym and antonym connections...")
    G = nx.Graph()
    
    # Add all words as nodes
    for word in similarity_data.keys():
        G.add_node(word)
    
    # Add edges for each word
    for word, similarities in tqdm.tqdm(similarity_data.items()):
        # Add edges to the two most similar words (synonyms)
        for similar_word, score in similarities[:2]:
            G.add_edge(word, similar_word, weight=score, type="synonym")
        
        # Add edges to the two least similar words (antonyms)
        for antonym_word, score in similarities[-2:]:
            G.add_edge(word, antonym_word, weight=score, type="antonym")
    
    print(f"Graph built with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")
    return G

def calculate_hop_distances(G):
    """Calculate the shortest path (hop distance) between all pairs of words."""
    print("Calculating hop distances between all word pairs...")
    
    # Use all_pairs_shortest_path_length from networkx
    hop_distances = dict(nx.all_pairs_shortest_path_length(G))
    
    # Convert to a more accessible format
    formatted_distances = defaultdict(dict)
    
    for source, targets in tqdm.tqdm(hop_distances.items()):
        for target, distance in targets.items():
            if source != target:  # Skip self-distances
                formatted_distances[source][target] = distance
    
    return formatted_distances

def find_unreachable_pairs(similarity_data, hop_distances):
    """Find pairs of words that are not reachable from each other."""
    all_words = set(similarity_data.keys())
    unreachable_pairs = []
    
    for word in all_words:
        reachable_words = set(hop_distances[word].keys())
        unreachable_words = all_words - reachable_words - {word}
        
        for unreachable in unreachable_words:
            unreachable_pairs.append((word, unreachable))
    
    return unreachable_pairs

def annotate_similarity_data(similarity_data, hop_distances):
    """
    Annotate the similarity data with hop distances.
    For each word, add the hop distance to every other word.
    """
    print("Annotating similarity data with hop distances...")
    annotated_data = {}
    
    for word, similarities in tqdm.tqdm(similarity_data.items()):
        # Create a mapping of target words to their similarity scores
        sim_dict = {target: score for target, score in similarities}
        
        # Create annotated entries with both similarity and hop distance
        annotated_similarities = []
        
        for target_word in similarity_data.keys():
            if word != target_word:
                # Get similarity score (default to 0 if not found)
                sim_score = sim_dict.get(target_word, 0)
                
                # Get hop distance (default to -1 if not reachable)
                hop_distance = hop_distances[word].get(target_word, -1)
                
                # Add to annotated list
                annotated_similarities.append({
                    "word": target_word,
                    "similarity": sim_score,
                    "hop_distance": hop_distance
                })
        
        # Sort by similarity score (descending)
        annotated_similarities.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Store in annotated data
        annotated_data[word] = annotated_similarities
    
    return annotated_data

def save_annotated_data(annotated_data, output_file="annotated_word_similarities.json"):
    """Save the annotated data to a JSON file."""
    print(f"Saving annotated data to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(annotated_data, f, indent=2)

def analyze_hop_distances(hop_distances):
    """Analyze the distribution of hop distances."""
    all_distances = []
    
    for source, targets in hop_distances.items():
        for target, distance in targets.items():
            all_distances.append(distance)
    
    # Calculate statistics
    total = len(all_distances)
    max_distance = max(all_distances)
    min_distance = min(all_distances)
    avg_distance = sum(all_distances) / total
    
    # Count frequency of each distance
    distance_counts = defaultdict(int)
    for d in all_distances:
        distance_counts[d] += 1
    
    print("\nHop Distance Analysis:")
    print(f"Total number of word pairs: {total}")
    print(f"Minimum hop distance: {min_distance}")
    print(f"Maximum hop distance: {max_distance}")
    print(f"Average hop distance: {avg_distance:.2f}")
    
    print("\nDistance distribution:")
    for distance in sorted(distance_counts.keys()):
        count = distance_counts[distance]
        percentage = (count / total) * 100
        print(f"Distance {distance}: {count} pairs ({percentage:.2f}%)")

def main():
    # Load similarity data
    similarity_data = load_similarity_data()
    
    # Build graph with synonym and antonym connections
    G = build_graph(similarity_data)
    
    # Check if the graph is connected
    connected = nx.is_connected(G)
    print(f"Is the graph fully connected? {connected}")
    
    if not connected:
        components = list(nx.connected_components(G))
        print(f"Number of connected components: {len(components)}")
        print(f"Largest component size: {len(max(components, key=len))}")
    
    # Calculate hop distances
    hop_distances = calculate_hop_distances(G)
    
    # Find unreachable word pairs
    unreachable_pairs = find_unreachable_pairs(similarity_data, hop_distances)
    print(f"Number of unreachable word pairs: {len(unreachable_pairs)}")
    
    # Analyze hop distances
    analyze_hop_distances(hop_distances)
    
    # Annotate similarity data with hop distances
    annotated_data = annotate_similarity_data(similarity_data, hop_distances)
    
    # Save annotated data
    save_annotated_data(annotated_data)
    
    print("Done!")

if __name__ == "__main__":
    main()
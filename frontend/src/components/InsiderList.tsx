import React from 'react';

// Define the interface for a single insider based on the data structure
interface Insider {
  cik: string;
  name: string;
  roles: string[];
  trades: any[]; // trades array is not needed for this component, but good to have for context
}

// Define the props for the component
interface InsiderListProps {
  insiders: Insider[];
}

const InsiderList: React.FC<InsiderListProps> = ({ insiders }) => {
  if (!insiders || insiders.length === 0) {
    return <p>No insider information available.</p>;
  }

  return (
    <div>
      <h3>Insiders</h3>
      <ul>
        {insiders.map((insider) => (
          <li key={insider.cik}>
            {insider.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InsiderList;

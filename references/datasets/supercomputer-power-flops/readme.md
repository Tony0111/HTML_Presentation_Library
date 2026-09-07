# Computational capacity of the fastest supercomputers - Data package

This data package contains the data that powers the chart ["Computational capacity of the fastest supercomputers"](https://ourworldindata.org/grapher/supercomputer-power-flops?v=1&csvType=full&useColumnShortNames=false) on the Our World in Data website. It was downloaded on September 7, 2026.

### Active Filters

A filtered subset of the full data was downloaded. The following filters were applied:

## CSV structure

Each row is an observation for an entity (usually a country or region) at a timepoint.

- "Entity" — the name of the entity, e.g. "United States".
- "Code" — our internal entity code. For most countries this is the [ISO alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) code, e.g. "USA"; historical and other non-standard entities get a custom code.
- "Year" or "Day" — the timepoint. Annual data has a "Year" column holding an integer year; otherwise a "Day" column holds a date string in the form "YYYY-MM-DD".
- The final column is the data column — the time series that powers the chart. Downloaded with the "full data" option it corresponds to the time series below; with "only selected data visible in the chart" it is transformed depending on the chart type, so the correspondence may be less direct.


## Metadata.json structure

The .metadata.json file contains metadata about the data package. The "charts" key contains information to recreate the chart, like the title, subtitle etc. The "columns" key contains information about each of the columns in the csv, like the unit, timespan covered, citation for the data etc.

## How we process data at Our World in Data

Our World in Data is almost never the original producer of the data - almost all of the data we use has been compiled by others. If you want to re-use data, it is your responsibility to ensure that you adhere to the sources' license and to credit them correctly. Please note that a single time series may have more than one source - e.g. when we stitch together data from different time periods by different producers or when we calculate per capita metrics using population data from a second source.

Preparing this data involves several processing steps. Depending on the data, this can include standardizing country names and world region definitions, converting units, calculating derived indicators such as per capita measures, as well as adding or adapting metadata such as the name or the description given to an indicator.
[Read about our data pipeline](https://docs.owid.io/projects/etl/).

## Detailed information about the data


### Computational capacity of the fastest supercomputer
Number of floating-point operations carried out per second by the fastest supercomputer in any given year. This is expressed in gigaflops, equivalent to 10⁹ floating-point operations per second.
Last updated: February 1, 2026  
Next expected update: February 2027  
Date range: 1993–2025  
Unit: gigaflops per second  
Source: Dongarra et al. (2025) – with major processing by Our World in Data  

#### How to cite this data

Dongarra et al. (2025) – with major processing by Our World in Data

#### What you should know about this data
- Computational capacity is measured with the [Linpack benchmark](https://www.netlib.org/utk/people/JackDongarra/PAPERS/hpl.pdf), which tests how fast a computer can solve a large, dense set of linear equations.
- This indicator shows the highest sustained Linpack speed achieved by the fastest supercomputer each year, as recorded by the [TOP500](https://top500.org/) project.
- One gigaflop per second (Gflop/s) equals one billion floating-point operations per second.
- The Linpack benchmark tests only one type of computation, so it doesn't capture overall system performance. Real-world applications often perform differently than this benchmark suggests.

#### How this data is described by its producers
The Top500 list the 500 fastest computer system being used today. In 1993 the collection was started and has been updated every 6 months since then. The report lists the sites that have the 500 most powerful computer systems installed. The best Linpack benchmark performance achieved is used as a performance measure in ranking the computers. The TOP500 list has been updated twice a year since June 1993.

"The Linpack Benchmark is a measure of a computer’s floating-point rate of execution. It is determined by running a computer program that solves a dense system of linear equations. The paper “The LINPACK Benchmark: Past, Present, and Future” by Jack Dongarra, Piotr Luszczek, and Antoine Petitet provides a look at the details of the benchmark and provides performance data in graphics form for a number of machines on basic operations. A copy of the paper is available at http://www.netlib.org/utk/people/JackDongarra/PAPERS/hpl.pdf"

#### Notes on our processing step for this indicator
Data is aggregated from all TOP500 lists published between 1993 and 2025. For each year, we select the maximum Rmax value across all lists published in that year. Performance values are converted from teraflops per second (TFlop/s) to gigaflops per second (GFlop/s) by multiplying by 1000.


## Sources

These are the sources behind the data in this package. Each time series above names the ones it draws on in its citation.

### Dongarra et al. – TOP500 Supercomputer Lists (1993-2025)

The TOP500 project ranks and details the 500 most powerful non-distributed computer systems in the world. The project was started in 1993 and publishes an updated list of the supercomputers twice a year (June and November). This dataset combines all TOP500 lists from 1993 to 2025, including computational performance benchmarks, system specifications, and rankings.

Producer: Dongarra et al.  
Published: 2025  
Retrieved on: 2026-02-01  
Retrieved from: https://www.top500.org/  
License: © TOP500.org 1993-2025 (https://www.top500.org/)  

Citation: “Performance of Various Computers Using Standard Linear Equations Software”, Jack Dongarra, University of Tennessee, Knoxville TN, 37996, Computer Science Technical Report Number CS - 89 – 85, today’s date, url:http://www.netlib.org/benchmark/performance.ps."

    
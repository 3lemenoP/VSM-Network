function vsmNetwork_ver01

% scatterObj = findobj(findobj(gcf,'Type', 'figure', 'Tag', 'globalFig'), 'Type', 'scatter', 'Tag', '1/1/1');
% sizeData   = findobj(findobj(gcf,'Type', 'figure', 'Tag', 'globalFig'), 'Type', 'scatter', 'Tag', '1/1/1').SizeData

path(path,'C:\myMatlab\myFunctions')
[s]=openDatabase();


hfig=figure('units','normalized');
  set(hfig,'color',[0 0 0],'Toolbar','none','menubar','none')
  set(hfig,'Name','VSM Global','Numbertitle','off','Tag','globalFig')
  
s.ax1=axes('Parent',hfig,'units','normalized','Position',[0.05,0.05,0.9,0.9],'Tag','hmap','Color',[0 0 0],'NextPlot','add');
      hold on
      contextMenuAxes(s.ax1,s); 

    utility={'Select Utility Function: ',...
                       'Metabolic Pathways',...
                       'Organisational Effectiveness',...
                       'Organisational Efficiency',...
                       'Organisational Performance',...
                       'Resource Bargain',...
                       'Productive Hrs',...
                       'nonProductive Hrs'};

    uicontrol('Style', 'popup','units','normalized','String',utility,'Position', [0.4 0.92 0.2 0.05],'Callback',{@utilityFunctionCallback,s});

s.cursor=uicontrol('Parent',hfig,'style','edit','units','normalized','Position',[0,0,1,0.05],'Tag','hcursor',...
                   'BackgroundColor',[0.1 0.1 0.1],'ForegroundColor',[0.8 0.8 0.8],'String','Talk To Me ?  .....','FontSize',18);

createSeedNode(s)

function utilityFunctionCallback(src,~,s)

        val = src.Value;
        utilityFunction = src.String;
        s.selectedUtilityFunction=utilityFunction{val};

function contextMenuAxes(ax,s)

  cmenu=uicontextmenu;   
  set(ax,'UIContextMenu',cmenu)
    
    u0=uimenu(cmenu,'Label','create Embeddings','Separator','on');
       uimenu(u0,'Label','S5 Embeddings');
       uimenu(u0,'Label','S4 Embeddings');
    u0=uimenu(cmenu,'Label','manage Build','Separator','on');   
       uimenu(u0,'Label','get organisation','Callback',{@getOrganisation,s});
       uimenu(u0,'Label','view pathways in senseMaker','Callback',{@viewSenseMaker,'0/0/1'});
       uimenu(u0,'Label','refresh screen','Callback',{@updateScreen,s});
    u0=uimenu(cmenu,'Label','manage database','Separator','on');
       uimenu(u0,'Label','clear database','Callback',{@updateDatabase,s,'clearTable'});
    u0=uimenu(cmenu,'Label','view conversations','Separator','on');
       uimenu(u0,'Label','stigmeric conversations','Callback',{@stigmergicConversations,s,'stigmergy'});
       uimenu(u0,'Label','pheromonal conversations','Callback',{@stigmergicConversations,s,'pheromonal'});

function contextMenu_node(hParent,s)

% get node details

sqlQuery=[' SELECT DISTINCT organisation,orgUnit,layerId ',...
          ' FROM [iOrgX] ',...
          ' WHERE childID = ',strcat('''',s.Tag,'''')];

    e=exec(s.conn,sqlQuery);
    e=fetch(e);
    x=e.Data;
    close(e)
    
    if size(x,2)==1
       x{1,1}='root';
       x{1,2}='root';
       recursion=1;
    else
       recursion=x{1,3}+1;
    end

  cmenu=uicontextmenu;   
  set(hParent,'UIContextMenu',cmenu)

       uimenu(cmenu,'Label',['object Ref: ',s.Tag]);
       uimenu(cmenu,'Label',['object Name: ',x{1,2}]);
       uimenu(cmenu,'Label',['update Name: ',x{1,2}],'Callback',{@updateNodeName,s});
       uimenu(cmenu,'Label',['Heads Up Display: ',x{1,2}],'Callback',{@headsUpDisplay});

      u0=uimenu(cmenu,'Label','VSM Enquiry','Separator','on');
         uimenu(u0,'Label','view System-In-Focus','Callback',{@viewSiF,s});
         uimenu(u0,'Label','view Sub-Structure','Callback',{@viewRecursiveStructure,s});
         uimenu(u0,'Label','trace Sub-Structure','Callback',{@traceRecursiveStructure,s});
           u0=uimenu(u0,'Label','View VSM Systems','Separator','on');
              uimenu(u0,'Label',['S5 Topics for  : ',x{1,2}],'Callback',{@viewRecursiveStructure,s});
              uimenu(u0,'Label',['S4 Topics for  : ',x{1,2}],'Callback',{@viewRecursiveStructure,s});
              uimenu(u0,'Label',['S3 Topics for  : ',x{1,2}],'Callback',{@viewRecursiveStructure,s});
              uimenu(u0,'Label',['S3* Topics for  : ',x{1,2}],'Callback',{@viewRecursiveStructure,s});
              uimenu(u0,'Label',['S2 Topics for  : ',x{1,2}],'Callback',{@viewRecursiveStructure,s});
              uimenu(u0,'Label',['S1 Topics for  : ',x{1,2}],'Callback',{@viewRecursiveStructure,s});
            u0=uimenu(cmenu,'Label','View Triple Index','Separator','on');
            u0=uimenu(cmenu,'Label','Homeostats','Separator','on');
            u0=uimenu(cmenu,'Label','View Algodonics','Separator','on');

    u0=uimenu(cmenu,'Label','Structural Enquiry','Separator','on');
       uimenu(u0,'Label','trace Sub-Structure','Callback',{@traceRecursiveStructure,s});
       uimenu(u0,'Label','view sub units','Callback',{@viewRecursiveStructure,s});
       uimenu(u0,'Label','view sub units in senseMaker','Callback',{@viewSenseMaker,s.Tag});

    u0=uimenu(cmenu,'Label','Modify Structure','Separator','on');   
       uimenu(u0,'Label','create group','Callback',{@addOrganisationalUnit,s,hParent,'child',recursion});
       uimenu(u0,'Label','add group node','Callback',{@addDeleteNode,s,hParent,'add'});
       uimenu(u0,'Label','delete group','Callback',{@deleteOrganisationalUnit,s,hParent,'deleteChildren'});
       uimenu(u0,'Label','delete group node','Callback',{@addDeleteNode,s,hParent,'delete'});

       

function viewSiF(~,~,s)

vsmIndividual_ver01(s.Tag,s.conn)


function createSeedNode(s)

axes(s.ax1)
cla

seedSet=[0,0]; % seed node location
s.Tag='0/0/1';
s.Org='n/a';

s.LSCref=[0 0 1]; % layer shape node 
s.edgeLength=1; % start length of polygon side

h=scatter3(seedSet(1,1),seedSet(1,2),10,500,[1 0 0],'filled','Tag',s.Tag,'UserData',s); % handle to seed node
  
text(seedSet(1,1)+0.01,seedSet(1,2)+0.05,10,s.Tag,'color',[1 0 0],'FontSize',12)

contextMenu_node(h,s)

function createOrganisation(~,~,s)

x=inputdlg('Enter Organisation Name:','Input'); 
s.orgName=x{1,1};

function getOrganisation(~,~,s)

    sqlQuery=[' SELECT DISTINCT Organisation ',...
              ' FROM [iOrgX] ',...
              ' WHERE Organisation IS NOT NULL'];
    
        e=exec(s.conn,sqlQuery);
        e=fetch(e);
        x=e.Data;
        close(e)

        orgList0={'create new model'};
        orgList1=x(1,:);
        orgList=vertcat(orgList0,orgList1);
        
      [selection]=listdlg('PromptString','select Organisation',...
                          'SelectionMode','single',...
                          'ListString',orgList);

       if selection==1

           x=inputdlg('Enter Organisation Name:','Input'); 
           s.orgName=x{1,1};
           x={1,1,1,1,'0/0/1'};

       else

          organisation=orgList(selection,1);

            sqlQuery = [' SELECT DISTINCT evolution,layerID,shapeID,polyOrder,parentID ',...
                        ' FROM [iOrgX] ',...
                        ' WHERE organisation = ','''',organisation{1,1},'''',...
                        ' ORDER BY evolution ASC,layerID ASC,shapeID ASC'];
        
            e=exec(s.conn,sqlQuery);
            e=fetch(e);
            x=e.Data;
            close(e)
        
           x=x(:,2:end); % remove evolution column

       end
    
          filterText=1;
        
            for i=1:size(x,1)
                  shapeUnit=x(i,:);        
                  polyOrder=x{i,3};
                  parent=x{i,4};
                  hParent=findobj(gcf,'type','scatter','-and','Tag',parent);  % h is the parent of the child
                  recursion=x{i,1};
                  fractaliseObject(0,0,shapeUnit,'existing',hParent,polyOrder,recursion,filterText)
            end
    
        drawnow

       
function fractaliseObject(~,~,shapeUnit,relationship,hParent,polyOrder,recursion,filterText)

s=hParent.UserData;
s.childSet=[];
s.childSet(1,1)=hParent.XData;
s.childSet(1,2)=hParent.YData;
s.polyOrder=polyOrder;
s.parent=hParent.Tag;
s.relationship=relationship;
s.recursion=recursion;

s.rotation=360/s.polyOrder;
s.evalEdgeLength='s.edgeLength*2/s.polyOrder'; % the '2' represents the edge scaling factor
s.xAdj='s.edgeLength*0.5';
s.yAdj='(max(testSet(:,2))-min(testSet(:,2)))/2';

childSet=s.childSet;
parentNodeXY=childSet;
color=getColor(recursion);

          % Sandboxing: test to determine max-min extents of the new shape
           [testSet,s]=sandBox(s);
          % generate new polygon around node from parentNodeXY testSet is used by yAdj to determine start position for the polygon generation
           [childSet]=generatePolygon(testSet,parentNodeXY,s);
          % plot polygon
            plotPolygon(childSet,color,s)
          % remove duplicate last row used for drawing shape only      
            childSet=childSet(1:end-1,:); 
          % plot the management lines
            plotLines(childSet,parentNodeXY,color,s)
          % plot edge nodes of the polyhedra
            plotNodes(shapeUnit,childSet,color,s,filterText)

function [childSet]=generatePolygon(testSet,parentNodeXY,s)

childSet=[parentNodeXY(1,1)-eval(s.xAdj),parentNodeXY(1,2)-eval(s.yAdj)];
direction=[1,0];   

% generate polygon
  for j=1:s.polyOrder
      
      nextPos=forward2(childSet(j,:),direction,s.edgeLength);
      childSet=[childSet;nextPos]; % Takes your current position, 
                                       % then goes forward in the given direction 
                                       % for a given distance 
                                       % then repeats to generate a regular polygon.
      direction=turn2(direction,s.rotation);
  end

function [header]=getHeader()

    header{1,1}='recursion';
    header{1,2}='shape';
    header{1,3}='node';
    header{1,4}='x';
    header{1,5}='y';
   
function [color]=getColor(recursion)

dimFactor=1;

    if recursion==0
        color=[1 1 0];
    elseif recursion==1
        color=[1 0 0];
    elseif recursion==2
        color=[0 1 0];
    elseif recursion==3
        color=[1 1 0];
    elseif recursion==4
        color=[1 0 0];
    elseif recursion==5
        color=[1 0 1];
    else
        color=[0.1 0.1 0.1];
    end
    
  color=color*dimFactor;

function []=flashNode(H,~)

h=findobj(gcf,'Tag',H.String);

for j=1:size(h,1)

    h(j).MarkerFaceColor=[0 1 0];
    origSize=h(j).SizeData;

    % flash
    for i=1:5
        h(j).SizeData=1000;
        pause(0.25)
        h(j).SizeData=origSize;
        pause(0.25)
    end

end

function plotPolygon(childSet,color,s)
      
Z=zeros(size(childSet,1),1);

for ii=1:size(childSet,1)
     Z(ii,1)=-s.LSCref(1)-1;
end
   plot3(childSet(:,1),childSet(:,2),Z,...
        'LineWidth',0.1,...
        'Color',color*0.5,...
        'MarkerSize',3,...
        'MarkerEdgeColor','b',...
        'MarkerFaceColor',[0.5,0.5,0.5]);
            
function plotLines(childSet,parentNodeXY,color,s)

         for k=1:size(childSet,1)
              X(1,1)=parentNodeXY(1,1);
              X(2,1)=childSet(k,1);
              Y(1,1)=parentNodeXY(1,2);
              Y(2,1)=childSet(k,2);
              Z(1,1)=-s.LSCref(1);
              Z(2,1)=-s.LSCref(1)-1;
              h=line(X,Y,Z,'LineWidth',1,'LineStyle','-','Color',color);

              if s.recursion==0
                  h.LineWidth=6;
              elseif s.recursion==1
                  h.LineWidth=4;
              end

         end        
         
function plotNodes(shapeUnit,childSet,color,s,filterText) % plot children from parent node

  s.childSet=childSet;
  
    if size(shapeUnit,2)==4 % in database mode
        
       %shapeUnit: layerID,shapeID,polyOrder,parentID 
       
           layer=shapeUnit{1,1};
           shape=shapeUnit{1,2};

           sqlQuery = ['SELECT DISTINCT nodeID,orgUnit FROM [iOrgX] WHERE layerID = ',num2str(shapeUnit{1,1}),' AND shapeID = ',num2str(shapeUnit{1,2})];
           set(s.cursor,"String",['sqlQuery = ',sqlQuery])
           drawnow
           
           e=exec(s.conn,sqlQuery);
           e=fetch(e);
           nodeID_listing=e.Data;
           close(e)
       
    else % in create new child mode
        
           layer=s.LSCref(1)+1; % derived from parent callback increment layer
           shape=s.LSCref(3);   % shapeID derved from nodeID
        
           e=exec(s.conn,['SELECT MAX(nodeID) FROM [iOrgX] WHERE layerID = ',num2str(layer)]);
           e=fetch(e);
           maxNodeID=e.Data;
           close(e)
    end
    
% idx needs only to keep track of the new recursion and shape index
% and ensure that they are unique if not update shape address only
      
idx=[];
        
     for i=1:size(s.childSet,1)
         
           idx{i,1}=layer;
           idx{i,2}=shape;
           
              if size(shapeUnit,2)==4 % in database mode
                  node=nodeID_listing{i,1};
                  name=nodeID_listing{i,2};
              else % in create new child mode
                  node=maxNodeID{1,1}+i;
                  name='null';
              end
          
           idx{i,3}=node;
           idx{i,4}=size(s.childSet,1);
           idx{i,5}=s.parent;
           
           s.LSCref(1)=layer;
           s.LSCref(2)=shape;
           s.LSCref(3)=node;
           
           s.Tag=[num2str(layer),'/',num2str(shape),'/',num2str(node)];
           
           if strcmp(name,'null')
              name=s.Tag;
           end
           
           hParent=scatter3(s.childSet(i,1),s.childSet(i,2),10,100/layer^2,color,'filled','Tag',s.Tag,'UserData',s);

           if ~iscell(shapeUnit) 
               text(s.childSet(i,1)+0.01,s.childSet(i,2)+0.01,10,name,'color',[1 1 1],'FontSize',8)
           elseif filterText==0  
               text(s.childSet(i,1)+0.01,s.childSet(i,2)+0.01,10,name,'color',[1 1 1],'FontSize',8)
           elseif iscell(shapeUnit) && shapeUnit{1,1}<5  && shapeUnit{1,3}<8 
               text(s.childSet(i,1)+0.01,s.childSet(i,2)+0.01,10,name,'color',[1 1 1],'FontSize',8)
           end

         contextMenu_node(hParent,s) 
     end 

% save to cache before transferring to iOrgX
if strcmp(s.relationship,'child') || strcmp(s.relationship,'sibling') 
    
     e=exec(s.conn,'SELECT MAX(evolution) FROM [iOrgX]');
       e=fetch(e);
       eMax=e.Data;
       close(e)

       %idx=cell(1,1);
       
       for i=1:size(idx,1)
           idx{i,6}=eMax{1,1}+1;
           idx{i,7}=strcat(num2str(idx{i,1}),'/',num2str(idx{i,2}),'/',num2str(idx{i,3})); % creates childID
           idx{i,8}=idx{i,7};
           idx{i,9}='helloWorld';
       end
         lineNum = 423
         dataTable=cell2table(idx,'VariableNames',{'layerID','shapeID','nodeID','polyOrder','parentID','evolution','childID','orgUnit','organisation'})
         sqlwrite(s.conn,'iOrgX',dataTable)

         %insert(s.conn,'iOrgX',{'layerID','shapeID','nodeID','polyOrder','parentID','evolution','childID','orgUnit'},idx);
end

function updateDatabase(~,~,s,request)

if strcmp(request,'clearTable')
    exec(s.conn,'TRUNCATE TABLE [iOrgX]');
    refreshScreen(s)
end

function stigmergicConversations(~,~,s,type)

e=exec(s.conn,'SELECT DISTINCT childID,parentID FROM [iOrgX] ');
e=fetch(e);
x=e.Data;
close(e)

x=vertcat(x(:,1),x(:,2));

axes(gca)

for i=1:100
    
    idx=ceil(10*(rand(1)))+10;
    a=findobj(gcf,'type','scatter','-and','tag',x{idx});
    X(1,1)=a.XData;
    Y(1,1)=a.YData;
    Z(1,1)=10;
    
    idx=ceil(10*(rand(1)))+10;
    a=findobj(gcf,'type','scatter','-and','tag',x{idx});
    X(2,1)=a.XData;
    Y(2,1)=a.YData;
    Z(2,1)=10;
    
    plot3(X,Y,Z,'LineWidth',1,'Color',[.8 .8 .8])
    drawnow
    pause(0.1)
    
    integerTest=~mod(i/10,1);
    
    if integerTest
      try  
        idx=ceil(100*(rand(1)))+10;
        a=findobj(gcf,'type','scatter','-and','tag',x{idx});
            X(1,1)=a.XData;
            Y(1,1)=a.YData;
            Z(1,1)=10;

        idx=ceil(100*(rand(1)))+10;
        a=findobj(gcf,'type','scatter','-and','tag',x{idx});
            X(2,1)=a.XData;
            Y(2,1)=a.YData;
            Z(2,1)=10;

        plot3(X,Y,Z,'LineWidth',1,'Color',[.8 .8 .8])
        drawnow
        pause(0.1)
        
      catch
      end
        
    end
end

function viewRecursiveStructure(hobj,~,s)

hfig=figure('units','normalized');
  set(hfig,'color',[0 0 0],'Toolbar','none','menubar','none')
  set(hfig,'Name','VSM Local','Numbertitle','off')

s.ax2=axes('Parent',hfig,'units','normalized','Position',[0.05,0.05,0.9,0.9],'Tag','hmap2','Color',[0 0 0],'NextPlot','add');
      hold on
cla


% createSeedNode(s)

%seedSet=[0,0]; % seed node location
%s.Tag='0/0/1';
s.LSCref=[0 0 1]; % layer shape node 
s.edgeLength=1; % start length of polygon side

h=scatter3(0,0,10,500,[1 1 1],'filled','Tag',s.Tag,'UserData',s); % handle to seed node
contextMenu_node(h,s)

sqlQuery=[' SELECT DISTINCT evolution,layerID,shapeID,polyOrder,parentID ',...
          ' FROM [iOrgX] ',...
          ' WHERE parentID = ',strcat('''',s.Tag,''''),...
          ' ORDER BY evolution ASC,layerID ASC,shapeID ASC'];

    e=exec(s.conn,sqlQuery);
    e=fetch(e);
    x1=e.Data;
    close(e)


sqlQuery=[' WITH RecursiveCTE AS (',...
          ' SELECT evolution,layerID,shapeID,polyOrder,parentID,childID  ',...
          ' FROM iOrgX ',...
          ' WHERE parentID = ',strcat('''',s.Tag,''''),...
          ' UNION ALL ',...
          ' SELECT t.evolution,t.layerID,t.shapeID,t.polyOrder,t.parentID,t.childID  ',...
          ' FROM iOrgX t ',...
          ' JOIN RecursiveCTE rcte ON t.parentID = rcte.childID ) ',...
          ' SELECT DISTINCT t.evolution,t.layerID,t.shapeID,t.polyOrder,t.parentID '...
          ' FROM iOrgX t '...
          ' WHERE t.parentID IN (SELECT childID FROM RecursiveCTE) ',...
          ' AND NOT EXISTS ( ',...
          ' SELECT 1 ',...
          ' FROM iOrgX t2',...
          ' WHERE t2.parentID = t.childID)'];

    e=exec(s.conn,sqlQuery);
    e=fetch(e);
    x2=e.Data;
    close(e)

    if size(x2,2)>1
      x=vertcat(x1,x2);
    else 
      x=x1;
    end

x=x(:,2:end); % remove evolution column

filterText=0;

for i=1:size(x,1)
      shapeUnit=x(i,:);        
      polyOrder=x{i,3};
      parent=x{i,4};
      recursion=x{i,1};
      hParent=findobj(gcf,'type','scatter','-and','Tag',parent);  % h is the parent of the child
      fractaliseObject(0,0,shapeUnit,'existing',hParent,polyOrder,recursion,filterText)
end

% pass over system in focus (sif) & the database connector

% sif=x{1,4};
% vsmIndividual_ver01(sif,s.conn)


function [ax]=headsUpDisplay(~,~)  

  % Define the final position of the axes
    finalPosition = [0.2, 0.4, 0.6, 0.4]; 
        
     ax=axes('Parent',gcf,'units','normalized','Position',[0.5, 0.5, 0.01, 0.01],'Color',[0 0 0 0.8],'NextPlot','add','Tag','tempAxes');
     ax.Box = 'on';
     ax.XColor=[0.8 0.8 0];
     ax.YColor=[0.8 0.8 0];

     % Slowly expand the axes to the final position
        for t = linspace(0, 1, 100)
            newPosition = ax.Position + t * (finalPosition - ax.Position);
            ax.Position = newPosition;
            pause(0.05); % Pause to slow down the expansion
        end

   setupFigContextMenu(ax)


   
function updateNodeName(~,~,s)  

prompt={'input node name'};
title='Input';
dims=[1 35];
definput={''};
exdata=inputdlg(prompt,title,dims,definput);

update(s.conn,'[iOrgX]',{'orgUnit'},exdata,['WHERE childID = ',strcat('''',s.Tag,'''')]);
refreshScreen(s)

function refreshScreen(s)

axes(findobj(gcf,'type','axes','-and','Tag','hmap'))
cla
createSeedNode(s)
getOrganisation(0,0,s)

function sliderCB(obj,~)

value=get(obj,'Value');
disp(value)
  
function drawText()

 text(0.5,2.26,'Communicating Context',...
               'color',[1 1 1],...
               'fontSize',12,...
               'fontWeight','bold',...
               'horizontalAlignment','center',...
               'verticalAlignment','middle');

 text(0.5,2.21,'initiating & mediating coversations',...
               'color',[1 1 1],...
               'fontSize',8,...
               'fontWeight','bold',...
               'horizontalAlignment','center',...
               'verticalAlignment','middle');

 text(0.5,2.16,'Value=Price-Cost(Materials+Energy+Information)',...
               'color',[1 1 1],...
               'fontSize',8,...
               'fontWeight','bold',...
               'horizontalAlignment','center',...
               'verticalAlignment','middle'); 
           
function [testSet,s]=sandBox(s)

testSet=[0,0];
direction=[1,0]; 

% change edge length for new fractal recursion
 s.edgeLength=eval(s.evalEdgeLength); 

 for j=1:s.polyOrder
     nextPos=forward2(testSet(j,:),direction,s.edgeLength);
     testSet=[testSet;nextPos]; % Takes your current position, then goes forward a given direction for a given distance and outputs the final position pos.
     direction=turn2(direction,s.rotation);
 end           
 
function pos=forward2(coord,direction,distance)

% Takes your current position, then goes forward a given direction for a
% given distance and outputs the final position pos.

direction=direction/norm(direction);
pos=coord+distance*direction;

function v=turn2(u,angle)

% Takes a row vector u and rotates it by the given angle (in degrees).

angle=pi/180*angle;
rotMat=[cos(angle),sin(angle);-sin(angle),cos(angle)];
v=u*rotMat;       

function addDeleteNode(~,~,s,hChild,action)

% get parentID

    sqlQuery=['SELECT evolution,layerID,shapeID,nodeID,orgUnit,polyOrder,childID,parentID FROM [iOrgX] WHERE childID = ',strcat('''',hChild.Tag,'''')];
        e=exec(s.conn,sqlQuery);
        e=fetch(e);
        x=e.Data;
        close(e)
    
if strcmp(action,'delete') % check for children before deletion
    
    sqlQuery=['SELECT DISTINCT childID,childID FROM [iOrgX] WHERE parentID = ',strcat('''',hChild.Tag,'''')];
        e=exec(s.conn,sqlQuery);
        e=fetch(e);
        y=e.Data;
        close(e) 
            
    if size(y,2)==2 % children of children present+
       msgbox('remove children first using group delete'); 
    else

       sqlQuery=['DELETE FROM [iOrgX] WHERE childID = ',strcat('''',hChild.Tag,'''')];
       exec(s.conn,sqlQuery)

       sqlQuery = ['UPDATE [iOrgX] SET polyOrder = ', num2str(x{1,6}-1), ' WHERE parentID = ''', x{1,8}, ''''];
       exec(s.conn,sqlQuery)

       refreshScreen(s)
       
    end
    
elseif strcmp(action,'add')  
    
   e=exec(s.conn,['SELECT MAX(nodeID) FROM [iOrgX] WHERE layerID = ',num2str(x{1,2})]);
       e=fetch(e);
       maxNodeID=e.Data;
       close(e)
   
   x{1,4}=maxNodeID{1,1}+1; % new node number
   x{1,7}=strcat(num2str(x{1,2}),'/',num2str(x{1,3}),'/',num2str(x{1,4})); % new node ID
   x{1,5}=x{1,7};

       dataTable=cell2table(x,'VariableNames',{'evolution','layerID','shapeID','nodeID','orgUnit','polyOrder','childID','parentID'});
       sqlwrite(s.conn,'iOrgX',dataTable)

      %insert(s.conn,'[iOrgX]',{'evolution','layerID','shapeID','nodeID','orgUnit','polyOrder','childID','parentID'},x);

       update(s.conn,'[iOrgX]',{'polyOrder'},x{1,6}+1,['WHERE parentID = ',strcat('''',x{1,8},'''')]); % increment polyOrder
       refreshScreen(s)
end

function addOrganisationalUnit(~,~,s,hParent,relationship,recursion) 

% check for children
% if children exist abort request

    sqlQuery=['SELECT DISTINCT childID,childID FROM [iOrgX] WHERE parentID = ',strcat('''',hParent.Tag,'''')];
                e=exec(s.conn,sqlQuery);
                e=fetch(e);
                y=e.Data;
                close(e) 

       filterText=1;

    if size(y,2)==2 % children of children present
       msgbox('group node already exists'); 
    else
       polyOrder=str2double(inputdlg({'Enter no polygon vertices:'},'Input',1,{'6'}));
       fractaliseObject(0,0,0,relationship,hParent,polyOrder,recursion,filterText) 
    end
       
function deleteOrganisationalUnit(~,~,s,hParent,request)

% check that only one recursion exists
% if not generate error for user

if strcmp(request,'deleteChildren')

    sqlQuery=['SELECT DISTINCT childID,childID FROM [iOrgX] WHERE parentID = ',strcat('''',hParent.Tag,'''')];
        e=exec(s.conn,sqlQuery);
        e=fetch(e);
        x=e.Data;
        close(e)
    
 % check for children of children    
   flag=0;
  
    for i=1:size(x,1)
        sqlQuery=['SELECT DISTINCT childID,childID FROM [iOrgX] WHERE parentID = ',strcat('''',x{i,1},'''')];
            e=exec(s.conn,sqlQuery);
            e=fetch(e);
            y=e.Data;
            close(e) 
            
        if size(y,2)==2 % children of children present
           flag=1; 
        end
    end

    if flag==1
        msgbox('remove children of children first'); 
    else
       exec(s.conn,['DELETE FROM [iOrgX] WHERE parentID = ',strcat('''',hParent.Tag,'''')]);
       refreshScreen(s)
    end
end

function updateScreen(~,~,s)

refreshScreen(s)

function voiceCommand(~,~,s)

%dev=audiodevinfo;
h=msgbox('Start Speaking');
rec=audiorecorder(44100,16,1); % rec = recordng object
recordblocking(rec,5) % 5 sec
delete(h)
%play(rec)

y=getaudiodata(rec);
fs=rec.SampleRate;
%soundsc(y,fs) % playback

h=findobj(gcf,'Tag','voiceAxis');
plot(h,y)


h.Color=[0 0 0];
drawnow

%% Google™ Speech API  

% speechObject=speechClient('Google','languageCode','en-US');

%  APIoutput=speech2text(speechObject,y,fs);
%  s.h4.String=num2str(APIoutput{1,2});
%  s.h5.String=APIoutput{1,1};


%% IBM™ Watson Speech API

%  speechObject=speechClient('IBM','keywords',"CASM,CASM",'keywords_threshold',0.5);
% 
%  APIoutput=speech2text(speechObject,y,fs);
%  s.h4.String=num2str(APIoutput{1,2});
%  s.h5.String=APIoutput{1,1};


%% Microsoft™ Azure Speech API

speechObject=speechClient('Microsoft','language','en-US');

APIoutput=speech2text(speechObject,y,fs);
confidence=APIoutput{1,1}; % numeric
string=APIoutput{1,2}; % string
string=string{1,1};

 editH=findobj('Tag','sqlQueryWindow');
 editH.String=strcat(num2str(confidence),' / ',string);
 
%% API parser use T = num2english(1001) to covert number to text

objName=''; 
str='';
idx=strfind(string,' ');

  % parser
    for i=1:size(idx,2)-1
        if i==1;str{1}=string(1,1:idx(1)-1);end
        str{i+1}=num2str(words2num(string(1,idx(1,i)+1:idx(1,i+1)-1)));
        if i==size(idx,2)-1;str{i+2}=num2str(words2num(string(1,idx(i+1)+1:end)));end 
    end
    
  % assembler
    for i=2:size(str,2)
       action=str{1};
        if i<size(str,2)
            objName=strcat(objName,str{i},'/');
        else
            objName=strcat(objName,str{i});
        end
    end
    
  % identify action  addDeleteNode(s,objName,'delete')  

   if strcmp(action,'delete')
       
      addDeleteNode('','',s,findobj('Tag',objName),'delete')
      
   elseif strcmp(action,'add')
       
      addDeleteNode('','',s,findobj('Tag',objName),'add') 
      
   elseif strcmp(action,'remove')
       
      deleteOrganisationalUnit('','',s,findobj('Tag',objName),'deleteChildren')
       
   elseif strcmp(action,'flash')
  
      h=findobj('Tag',objName);

        for j=1:size(h,1)

          h(j).MarkerFaceColor=[0 1 0];
          origSize=h(j).SizeData;

            for i=1:20
                h(j).SizeData=500;
                pause(0.25)
                h(j).SizeData=origSize;
                pause(0.25)
            end  
            
        end
   end


function [s]=openDatabase()

d.DataReturnFormat = 'cellarray';
d.NullNumberRead = '0';
setdbprefs(d)
% s.conn=database('iOrg','glidePath','Administrator1@');
s.conn=database('iOrgX','','');


function []=setupFigContextMenu(ax)

  cmenu=uicontextmenu;   
  set(ax,'UIContextMenu',cmenu)
  
% MAPS 
    uimenu(cmenu,'Label','Delete HUD','Callback',{@deleteHUD,ax});
  Y=uimenu(cmenu,'Label','MAPS','separator','on');  
    uimenu(Y,'Label','VIEW: Emerites Map','Callback',{@loadEmiratesMap,ax});
    uimenu(Y,'Label','VIEW: Communities Map','Callback',{@loadCommunities});
    uimenu(Y,'Label','VIEW: dubaiMarina2cornich','Callback',{@dubaiMarina2cornich,0,0});
    uimenu(Y,'Label','VIEW: EV_chargingStations','Callback',{@getStations,1});
    uimenu(Y,'Label','VIEW: gas_chargingStations','Callback',{@getStations,0});
    uimenu(Y,'Label','VIEW: Roads','Callback',{@loadRoad,ax});

function []=deleteHUD(~,~,ax)

% Reduce the size of the axes
% Get the original position of the axes
origPosition = ax.Position; 

% Reduce the size of the axes
for scale = linspace(1, 0, 50)
    newPosition = [origPosition(1) + 0.5*origPosition(3)*(1-scale), ...
                   origPosition(2) + 0.5*origPosition(4)*(1-scale), ...
                   origPosition(3) * scale, ...
                   origPosition(4) * scale];
    ax.Position = newPosition;
    pause(0.01); % Pause to slow down the shrinking
end

% Close the figure
delete(ax);

function []=loadEmiratesMap(~,~,ax)

%s=get(gcf,'UserData');
%ax=findobj(gcf,'Tag','ax');
emirate=load('emirate');

clear h

for i=1:size(emirate.shape,1)
    
    h(i,1)=plot(emirate.shape(i),'Parent',ax);
    h(i,1).FaceColor=s.emirateColor{i,1};
    h(i,1).FaceAlpha=s.emirateMapFaceAlpha;
    h(i,1).EdgeColor=s.emirateColor{i,1};
    h(i,1).LineWidth=s.emirateMapLineWidth;

  clear ss

    ss.poly(1,:)=emirate.shape(i).Vertices(:,1)';
    ss.poly(2,:)=emirate.shape(i).Vertices(:,2)';

    h(i,1).UserData=ss;
    setupEmeritesContextMenu(h(i,1),ax,emirate.name{i,1})
    
  drawnow

end

s.patchColor=get(h,'FaceColor');
s.hPatch=h;


function showMetabolicPathways(~,~,s)


sqlQuery=strcat('EXEC parentPathsX @parentId = ''',s.Tag,''' ');
curs = exec(s.conn,sqlQuery);
curs = fetch(curs);
data = curs.Data;

T=array2table(data);
writetable(T,'SPoutput.csv');
storyboardSequencer('SPoutput.csv')



function traceRecursiveStructure(~,~,s)

conn=createConn();

sqlQuery = ['EXEC [dbo].[node2pathways] @parentID = ','''',s.Tag,''' '];
set(s.cursor,"String",['sqlQuery = ',sqlQuery])
drawnow

curs = exec(conn,sqlQuery);
curs = fetch(curs);
data = curs.Data;
close(conn)
clear conn


inputTable=array2table(data);

totalRows = 0;

for idx = 1:height(inputTable)
    currentString = inputTable.data2{idx}; % accessing the second column of the inputTable
    totalRows = totalRows + numel(strsplit(currentString, '-')) - 1;
end

% Initialize a cell array to store the results
resultCellArray = cell(totalRows, 4);
rowCounter = 1;

% Loop through each string in inputTable
for idx = 1:height(inputTable)
    currentIndex = inputTable.data1{idx};
    inputString = inputTable.data2{idx};
    splitStrings = strsplit(inputString, '-');
    
    % Loop through the split strings and populate the resultCellArray
    for j = 1:(numel(splitStrings)-1)
        resultCellArray{rowCounter, 1} = currentIndex;
        resultCellArray{rowCounter, 2} = inputString;
        resultCellArray{rowCounter, 3} = splitStrings{j};
        resultCellArray{rowCounter, 4} = splitStrings{j+1};
        rowCounter = rowCounter + 1;
    end    
end

figureHandle = gcf; % Get handle of the current figure
hold on; % Keep the current plots when adding new ones

%figure; % Create a new figure
%hold on; % Keep the current plots when adding new ones

% Loop through each row of resultCellArray
for idx = 1:size(resultCellArray, 1)
    
    % Extract tags for the scatter plot objects
    tag1 = resultCellArray{idx, 3};
    tag2 = resultCellArray{idx, 4};
    
    % Use the tags to retrieve the scatter plot objects
    obj1 = findobj(figureHandle, 'Tag', tag1);
    obj2 = findobj(figureHandle, 'Tag', tag2);
    
    % Safety check in case no object is found with the provided tag
    if isempty(obj1) || isempty(obj2)
        warning(['No scatter object found for tags: ', tag1, ', ', tag2]);
        continue;
    end
    
    % Extract X and Y coordinates
    x1 = obj1.XData;
    y1 = obj1.YData;
    x2 = obj2.XData;
    y2 = obj2.YData;

    h(idx)=line([x1, x2], [y1, y2], 'Color',[0.9 0.9 0.9], 'LineStyle', '-','LineWidth',4);
    drawnow
end

contextMenuTrace(h); 

function contextMenuTrace(h)

  cmenu=uicontextmenu;   
  set(h,'UIContextMenu',cmenu)
    
    u0=uimenu(cmenu,'Label','modify Trace','Separator','on');
       uimenu(u0,'Label','delete Trace','Callback',{@deleteTrace,h});

function deleteTrace(~,~,h)  

delete(h)



function viewSenseMaker(~,~,parentId)

conn=createConn();

curs = exec(conn, strcat('EXEC [dbo].[node2pathways] @parentID = ','''',parentId,''' '));
curs = fetch(curs);
data = curs.Data;
close(conn)
clear conn

T=array2table(data);

writetable(T,'SPoutput.csv');
storyboardSequencer('SPoutput.csv')

